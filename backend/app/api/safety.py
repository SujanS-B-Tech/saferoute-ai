from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Role, SafetyDataSource, PrivacyClass, CCTVRecord, SafetyIndicator
from app.services.safety.providers import FACTOR_LABELS
from app.services.geo import jitter_coords

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

@router.get("/map-indicators")
def map_indicators(lat: float, lon: float, radius_m: int = 2000, db: Session = Depends(get_db), user = Depends(get_current_user)):
    from app.services.geo import bbox
    s, w, n, e = bbox([(lat, lon)], radius_m)
    
    # We load CCTVs and overrides just to show them visually on the map mask tests
    cctvs = db.scalars(select(CCTVRecord).where(
        CCTVRecord.latitude.between(s, n), CCTVRecord.longitude.between(w, e)
    )).all()
    
    overrides = db.scalars(select(SafetyIndicator).where(
        SafetyIndicator.indicator_type == "admin_override",
        SafetyIndicator.latitude.between(s, n), SafetyIndicator.longitude.between(w, e)
    )).all()

    is_admin = user.role in [Role.SUPER_ADMIN.value, Role.DATA_MODERATOR.value]
    
    results = []
    for c in cctvs:
        use_lat, use_lon = c.latitude, c.longitude
        if c.privacy_class == PrivacyClass.RESTRICTED.value and not is_admin:
            use_lat, use_lon = jitter_coords(use_lat, use_lon)
            
        results.append({
            "type": "CCTV", "latitude": use_lat, "longitude": use_lon,
            "is_exact": is_admin
        })
        
    for o in overrides:
        results.append({
            "type": "Admin Override", "latitude": o.latitude, "longitude": o.longitude,
            "is_exact": True
        })
        
    return results

