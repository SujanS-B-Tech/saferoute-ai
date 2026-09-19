"""Routing providers behind one interface. Swap via ROUTING_PROVIDER."""
import math
from abc import ABC, abstractmethod

import httpx

from app.core.config import get_settings
from app.services.geo import LatLon, haversine_m, interpolate
from app.services.safety.engine import RouteCandidate

SPEEDS_MPS = {"walking": 1.3, "two_wheeler": 8.0, "car": 9.0, "public_transport": 6.0}


class RoutingError(Exception):
    pass


class RoutingProvider(ABC):
    name: str
    simulated: bool = False

    @abstractmethod
    def alternatives(self, origin: LatLon, dest: LatLon, mode: str) -> list[RouteCandidate]: ...


class DemoRoutingProvider(RoutingProvider):
    """SIMULATED geometry: smooth curves between the endpoints, not real roads."""
    name, simulated = "demo", True

    def alternatives(self, origin, dest, mode):
        straight = haversine_m(origin, dest)
        if straight < 30:
            raise RoutingError("Origin and destination are too close to plan a route.")
        speed = SPEEDS_MPS.get(mode, 1.3)
        out = []
        for i, bow in enumerate((0.0, 0.12, -0.18)):
            pts = []
            for k in range(41):
                t = k / 40
                base = interpolate(origin, dest, t)
                off = math.sin(math.pi * t) * bow * (dest[0] - origin[0]), math.sin(math.pi * t) * bow * (dest[1] - origin[1])
                # offset perpendicular to the direction of travel
                pts.append((base[0] - off[1], base[1] + off[0]))
            dist = sum(haversine_m(pts[j], pts[j + 1]) for j in range(40)) * 1.25  # crude road-winding factor
            out.append(RouteCandidate(f"demo-{chr(65 + i)}", pts, dist, dist / speed, simulated_geometry=True))
        return out


class OSRMRoutingProvider(RoutingProvider):
    name = "osrm"
    PROFILES = {"walking": "foot", "two_wheeler": "driving", "car": "driving", "public_transport": "driving"}

    def __init__(self, base_url: str):
        if not base_url:
            raise RoutingError("OSRM_BASE_URL is not configured.")
        self.base_url = base_url.rstrip("/")

    def alternatives(self, origin, dest, mode):
        profile = self.PROFILES.get(mode, "driving")
        url = f"{self.base_url}/route/v1/{profile}/{origin[1]},{origin[0]};{dest[1]},{dest[0]}"
        try:
            r = httpx.get(url, params={"alternatives": "true", "overview": "full", "geometries": "geojson"}, timeout=10)
            r.raise_for_status()
            data = r.json()
        except (httpx.HTTPError, ValueError) as e:
            raise RoutingError(f"Routing service unavailable: {e}") from e
        if data.get("code") != "Ok":
            raise RoutingError(f"No route found ({data.get('code')}).")
        return [RouteCandidate(f"osrm-{i}", [(c[1], c[0]) for c in rt["geometry"]["coordinates"]],
                               rt["distance"], rt["duration"]) for i, rt in enumerate(data["routes"])]


def get_routing_provider() -> RoutingProvider:
    s = get_settings()
    if s.routing_provider == "osrm":
        return OSRMRoutingProvider(s.osrm_base_url)
    return DemoRoutingProvider()
