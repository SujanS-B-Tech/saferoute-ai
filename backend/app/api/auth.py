from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.models import EmergencyContact, User
from app.schemas.common import (ContactIn, ContactOut, LoginIn, PrivacyIn, RegisterIn, TokenOut,
                                UserOut)
from app.services.audit import audit

auth_router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])

# Constant-cost dummy hash so login timing does not reveal whether an email exists.
_DUMMY = hash_password("not-a-real-password")


@auth_router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = User(name=body.name, email=email, phone=body.phone, password_hash=hash_password(body.password),
                preferred_language=body.preferred_language)  # role is always standard_user here
    db.add(user)
    db.commit()
    audit(db, user.id, "user.register", "user", user.id)
    return user


@auth_router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    ok = verify_password(body.password, user.password_hash if user else _DUMMY)
    if not user or not ok or not user.is_active:
        audit(db, user.id if user else None, "user.login_failed", "user", user.id if user else None)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    audit(db, user.id, "user.login", "user", user.id)
    return TokenOut(access_token=create_access_token(user.id, user.role))


@auth_router.post("/logout", status_code=204)
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Stateless JWT: the client discards the token. Logged for audit; add a denylist if needed."""
    audit(db, user.id, "user.logout", "user", user.id)


@users_router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@users_router.patch("/me/privacy", response_model=UserOut)
def update_privacy(body: PrivacyIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.add(user)
    db.commit()
    audit(db, user.id, "user.privacy_update", "user", user.id, body.model_dump(exclude_none=True))
    return user


@users_router.get("/me/contacts", response_model=list[ContactOut])
def list_contacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(EmergencyContact).where(EmergencyContact.user_id == user.id)).all()


@users_router.post("/me/contacts", response_model=ContactOut, status_code=201)
def add_contact(body: ContactIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if len(user.contacts) >= 5:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Maximum of 5 trusted contacts")
    c = EmergencyContact(user_id=user.id, **body.model_dump())
    db.add(c)
    db.commit()
    audit(db, user.id, "contact.add", "emergency_contact", c.id)  # no phone number in the log
    return c


@users_router.delete("/me/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.get(EmergencyContact, contact_id)
    if not c or c.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    db.delete(c)
    db.commit()
    audit(db, user.id, "contact.delete", "emergency_contact", contact_id)

@users_router.delete("/me/history", status_code=204)
def delete_location_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models import Journey, Route
    # delete all journeys cleanly
    journeys = db.query(Journey).filter(Journey.user_id == user.id).all()
    for j in journeys:
        db.delete(j)
    # delete all routes connected
    routes = db.query(Route).filter(Route.user_id == user.id).all()
    for r in routes:
        db.delete(r)
        
    db.commit()
    audit(db, user.id, "user.history_wipe", "user", user.id)

@users_router.delete("/me", status_code=204)
def delete_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit(db, user.id, "user.delete", "user", user.id)
    # cascading deletes handle the rest thanks to cascade="all, delete-orphan"
    db.delete(user)
    db.commit()
