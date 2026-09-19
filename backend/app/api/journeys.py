from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Journey
from app.schemas.journeys import JourneyCreate, JourneyOut

router = APIRouter(prefix="/journeys", tags=["journeys"])


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.post("", response_model=JourneyOut)
def create_journey(body: JourneyCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    journey = Journey(
        user_id=user.id,
        route_id=body.route_id,
        origin_label=body.origin_label,
        destination_label=body.destination_label,
        status="planned",
        share_with_contact_ids=body.share_with_contact_ids,
        sharing_active=False,
        expected_arrival=body.expected_arrival,
        expires_at=body.expires_at,
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)
    return journey


@router.get("", response_model=List[JourneyOut])
def list_journeys(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Journey).filter(Journey.user_id == user.id).order_by(Journey.created_at.desc()).all()


@router.get("/{journey_id}", response_model=JourneyOut)
def get_journey(journey_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    journey = db.query(Journey).filter(Journey.id == journey_id, Journey.user_id == user.id).first()
    if not journey:
        raise HTTPException(404, "Journey not found")
    return journey


@router.post("/{journey_id}/start", response_model=JourneyOut)
def start_journey(journey_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    journey = db.query(Journey).filter(Journey.id == journey_id, Journey.user_id == user.id).first()
    if not journey:
        raise HTTPException(404, "Journey not found")
    
    journey.status = "active"
    journey.sharing_active = True if journey.share_with_contact_ids else False
    journey.started_at = utcnow()
    
    db.commit()
    db.refresh(journey)
    return journey


@router.post("/{journey_id}/end", response_model=JourneyOut)
def end_journey(journey_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    journey = db.query(Journey).filter(Journey.id == journey_id, Journey.user_id == user.id).first()
    if not journey:
        raise HTTPException(404, "Journey not found")
    
    journey.status = "completed"
    journey.sharing_active = False
    journey.ended_at = utcnow()
    
    db.commit()
    db.refresh(journey)
    return journey
