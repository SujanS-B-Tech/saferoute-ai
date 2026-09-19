from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import SafetyDataSource
from app.services.safety.providers import FACTOR_LABELS

router = APIRouter(prefix="/safety", tags=["safety"])

# Factors the engine knows about, so the UI can show "unavailable" honestly.
CATALOGUE = {f: label for f, label in FACTOR_LABELS.items()}


@router.get("/sources")
def sources(db: Session = Depends(get_db)):
    rows = {r.factor: r for r in db.scalars(select(SafetyDataSource)).all()}
    out = []
    for factor, label in CATALOGUE.items():
        r = rows.get(factor)
        out.append({
            "factor": factor, "label": label,
            "status": r.verification_status if r else "unavailable",
            "source_type": r.source_type if r else None,
            "owner": r.owner if r else None,
            "coverage": r.coverage if r else None,
            "limitations": r.limitations if r else "No data source configured.",
            "confidence": r.confidence if r else 0.0,
            "last_updated": r.last_updated if r else None,
            "message": None if r else f"{label} data is not currently available.",
        })
    return out
