"""Spatial queries. Bounding-box prefilter + haversine works on SQLite; on PostGIS use ST_DWithin."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (CCTVRecord, EmergencyFacility, PoliceStation, PrivacyClass, SafePoint,
                        SafetyDataSource)
from app.services.geo import bbox, haversine_m
from app.services.safety.types import EvidenceStatus, GeoPoint

FACILITY_MODELS = {"police": PoliceStation, "hospital": EmergencyFacility, "safe_point": SafePoint}


def freshness_days(rec) -> int | None:
    ts = rec.verified_at or rec.updated_at
    if ts is None:
        return None
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - ts).days


def nearby(db: Session, model, lat: float, lon: float, radius_m: float, limit: int = 20):
    s, w, n, e = bbox([(lat, lon)], radius_m)
    rows = db.scalars(select(model).where(model.latitude.between(s, n), model.longitude.between(w, e),
                                          model.privacy_class == PrivacyClass.PUBLIC.value)).all()
    out = [(haversine_m((lat, lon), (r.latitude, r.longitude)), r) for r in rows]
    return sorted([x for x in out if x[0] <= radius_m], key=lambda x: x[0])[:limit]


def _source_names(db: Session) -> dict[int, str]:
    return {s.id: s.name for s in db.scalars(select(SafetyDataSource)).all()}


def to_geopoints(db: Session, model, box: tuple[float, float, float, float],
                 include_restricted: bool = False) -> list[GeoPoint]:
    """Privacy note: CCTV coordinates are used INSIDE the engine only; the API never returns them."""
    s, w, n, e = box
    q = select(model).where(model.latitude.between(s, n), model.longitude.between(w, e))
    if not include_restricted and model is not CCTVRecord:
        q = q.where(model.privacy_class == PrivacyClass.PUBLIC.value)
    names = _source_names(db)
    pts = []
    for r in db.scalars(q).all():
        try:
            st = EvidenceStatus(r.verification_status)
        except ValueError:
            continue
        if st == EvidenceStatus.UNAVAILABLE:
            continue
        pts.append(GeoPoint(r.latitude, r.longitude, st, r.confidence,
                            names.get(r.source_id), r.verified_at or r.updated_at))
    return pts
