from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models import Role, CommunityReport, SafetyIndicator
from app.schemas.reports import ReportOut
from app.schemas.admin import ReportModeration, ManualOverrideCreate

router = APIRouter(prefix="/admin", tags=["admin"])

AdminDep = Depends(require_roles(Role.SUPER_ADMIN.value, Role.DATA_MODERATOR.value))

@router.get("/reports/pending", response_model=List[ReportOut])
def get_pending_reports(db: Session = Depends(get_db), admin=AdminDep):
    """Fetch all pending reports for moderation."""
    return db.query(CommunityReport).filter(CommunityReport.status == "pending").order_by(CommunityReport.created_at.asc()).all()

@router.patch("/reports/{report_id}/moderate", response_model=ReportOut)
def moderate_report(report_id: int, body: ReportModeration, db: Session = Depends(get_db), admin=AdminDep):
    """Approve or reject a report."""
    if body.status not in ["approved", "rejected"]:
        raise HTTPException(400, "Status must be 'approved' or 'rejected'")
        
    report = db.query(CommunityReport).filter(CommunityReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
        
    report.status = body.status
    report.moderator_id = admin.id
    if body.note:
        report.moderation_note = body.note
        
    db.commit()
    db.refresh(report)
    return report

@router.post("/override")
def deploy_override(body: ManualOverrideCreate, db: Session = Depends(get_db), admin=AdminDep):
    """Deploy a manual SafetyIndicator override globally."""
    indicator = SafetyIndicator(
        latitude=body.latitude,
        longitude=body.longitude,
        indicator_type=body.severity_label,
        value=1.0,  # absolute certainty of this flag
        detail=f"Admin override deployed by {admin.id}",
        privacy_class="public" # So it affects the routing map actively
    )
    db.add(indicator)
    db.commit()
    return {"message": "Override deployed globally."}
