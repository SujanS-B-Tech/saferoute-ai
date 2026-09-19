from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import EmergencyFacility, PoliceStation, SafePoint, SafetyDataSource
from app.schemas.common import FacilityOut
from app.services.geo_queries import freshness_days, nearby

router = APIRouter(tags=["facilities"])

SPECS = {
    "police": (PoliceStation, lambda r: "All-Women Police Station" if r.is_all_women else "Police station",
               "Emergency service location"),
    "hospital": (EmergencyFacility, lambda r: r.facility_type, "Emergency service location"),
    "safe_point": (SafePoint, lambda r: r.category, "Available assistance point"),
}


def _collect(db: Session, kinds, lat, lon, radius_m, limit):
    names = {s.id: s.name for s in db.scalars(select(SafetyDataSource)).all()}
    out: list[FacilityOut] = []
    for kind in kinds:
        model, cat, label = SPECS[kind]
        for dist, r in nearby(db, model, lat, lon, radius_m, limit):
            verified = r.verification_status == "verified"
            out.append(FacilityOut(
                id=r.id, kind=kind, name=r.name, category=cat(r), latitude=r.latitude, longitude=r.longitude,
                distance_m=round(dist), contact_phone=getattr(r, "contact_phone", None),
                operating_hours=getattr(r, "operating_hours", None),
                verification_status=r.verification_status, source=names.get(r.source_id),
                data_owner=r.data_owner, freshness_days=freshness_days(r),
                label=("Verified public facility" if verified and kind == "safe_point" else label)))
    return sorted(out, key=lambda f: f.distance_m)[:limit]


@router.get("/facilities/nearby", response_model=list[FacilityOut])
def facilities_nearby(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180),
                      radius_m: int = Query(3000, ge=100, le=20000),
                      kind: str | None = Query(None, pattern="^(police|hospital|safe_point)$"),
                      limit: int = Query(20, ge=1, le=50), db: Session = Depends(get_db)):
    return _collect(db, [kind] if kind else list(SPECS), lat, lon, radius_m, limit)


@router.get("/police-stations/nearby", response_model=list[FacilityOut])
def police_nearby(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180),
                  radius_m: int = Query(5000, ge=100, le=30000), limit: int = Query(5, ge=1, le=20),
                  db: Session = Depends(get_db)):
    return _collect(db, ["police"], lat, lon, radius_m, limit)
