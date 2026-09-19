from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import DEMO_BANNER, get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import CCTVRecord, EmergencyFacility, PoliceStation, SafePoint
from app.schemas.common import PlanRouteIn
from app.services.geo import bbox
from app.services.geo_queries import to_geopoints
from app.services.routing import RoutingError, get_routing_provider
from app.services.safety import EvaluationContext, compare_routes, default_providers, evaluate_route

router = APIRouter(prefix="/routes", tags=["routes"])


@router.post("/plan")
def plan(body: PlanRouteIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    provider = get_routing_provider()
    o, d = (body.origin.lat, body.origin.lon), (body.destination.lat, body.destination.lon)
    try:
        candidates = provider.alternatives(o, d, body.mode)
    except RoutingError as e:
        raise HTTPException(502, str(e))

    all_pts = [p for c in candidates for p in c.points]
    box = bbox(all_pts, 2600)  # widest provider radius + margin
    providers = default_providers(
        police=to_geopoints(db, PoliceStation, box), safe_points=to_geopoints(db, SafePoint, box),
        cctv=to_geopoints(db, CCTVRecord, box), facilities=to_geopoints(db, EmergencyFacility, box))
    demo = get_settings().demo_mode
    ctx = EvaluationContext(body.departure_time or datetime.now(timezone.utc), body.mode, demo)

    by_id = {c.id: c for c in candidates}
    ordered = compare_routes([evaluate_route(c, providers, ctx) for c in candidates], body.preference)
    return {
        "demo_banner": DEMO_BANNER if demo or provider.simulated else None,
        "routing_provider": provider.name,
        "geometry_simulated": provider.simulated,
        "preference": body.preference,
        "guidance": "Compare the trade-offs between time, distance, data coverage and safety-related "
                    "factors. No route is guaranteed safe.",
        "routes": [{**a.to_dict(), "geometry": by_id[a.route_id].points} for a in ordered],
    }
