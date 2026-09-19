from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import EmergencyAlert, EmergencyContact
from app.schemas.emergency import EmergencyAlertCreate, EmergencyAlertOut

router = APIRouter(prefix="/emergency", tags=["emergency"])

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

@router.post("/alerts", response_model=EmergencyAlertOut)
def create_alert(body: EmergencyAlertCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    alert = EmergencyAlert(
        user_id=user.id,
        latitude=body.latitude,
        longitude=body.longitude,
        status=body.status,  # "draft" or "activated" (if quick-start)
        is_mock=True,  # prototype limit
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/alerts/{alert_id}", response_model=EmergencyAlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == alert_id, EmergencyAlert.user_id == user.id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    return alert

@router.post("/alerts/{alert_id}/activate", response_model=EmergencyAlertOut)
def activate_alert(alert_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == alert_id, EmergencyAlert.user_id == user.id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == user.id).all()
    # explicitly mock the connection point
    if contacts:
        alert.notified_contact_ids = [c.id for c in contacts]
        alert.status = "contact_notification_attempted"
    else:
        alert.status = "activated" # No contacts to inform
        
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/alerts/{alert_id}/close", response_model=EmergencyAlertOut)
def close_alert(alert_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == alert_id, EmergencyAlert.user_id == user.id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    alert.status = "closed"
    alert.closed_at = utcnow()
    
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/alerts/{alert_id}/cancel", response_model=EmergencyAlertOut)
def cancel_alert(alert_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == alert_id, EmergencyAlert.user_id == user.id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    # Mark as a false alarm
    alert.status = "cancelled"
    alert.closed_at = utcnow()
    
    db.commit()
    db.refresh(alert)
    return alert
