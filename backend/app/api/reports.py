from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import CommunityReport
from app.schemas.reports import ReportCreate, ReportOut
from app.services.geo import bbox, haversine_m

router = APIRouter(prefix="/reports", tags=["reports"])

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

@router.post("", response_model=ReportOut)
def create_report(body: ReportCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Rate limit: max 5 per day per user
    yesterday = utcnow() - timedelta(days=1)
    recent_count = db.query(CommunityReport).filter(
        CommunityReport.user_id == user.id,
        CommunityReport.created_at >= yesterday
    ).count()
    if recent_count >= 5:
        raise HTTPException(429, "You have reached your daily limit for community reports.")

    # Duplicate detection (within 100m)
    box = bbox([(body.latitude, body.longitude)], 100.0)
    candidates = db.query(CommunityReport).filter(
        CommunityReport.category == body.category,
        CommunityReport.latitude.between(box[0], box[2]),
        CommunityReport.longitude.between(box[1], box[3])
    ).all()
    
    duplicate_of = None
    for c in candidates:
        if haversine_m((body.latitude, body.longitude), (c.latitude, c.longitude)) <= 100.0:
            # Attach to the parent duplicate
            duplicate_of = c.id if not c.duplicate_of else c.duplicate_of
            break

    report = CommunityReport(
        user_id=user.id,
        category=body.category,
        latitude=body.latitude,
        longitude=body.longitude,
        description=body.description,
        photo_ref=body.photo_ref,
        status="pending",
        duplicate_of=duplicate_of
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.get("/me", response_model=List[ReportOut])
def list_my_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(CommunityReport).filter(CommunityReport.user_id == user.id).order_by(CommunityReport.created_at.desc()).all()
