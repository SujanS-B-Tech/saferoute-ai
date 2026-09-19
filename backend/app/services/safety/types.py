from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from app.services.geo import LatLon


class EvidenceStatus(str, Enum):
    VERIFIED = "verified"
    ESTIMATED = "estimated"
    USER_REPORTED = "user_reported"
    SIMULATED = "simulated"
    UNAVAILABLE = "unavailable"


@dataclass
class Segment:
    seq: int
    points: list[LatLon]
    length_m: float
    mid: LatLon


@dataclass
class EvaluationContext:
    departure: datetime
    travel_mode: str = "walking"
    demo_mode: bool = False


@dataclass
class Evidence:
    """One factor's evidence for one segment. value=None means no evidence (never 'bad')."""
    factor: str
    status: EvidenceStatus
    value: float | None = None       # 0..1, higher = better supported by available data
    confidence: float = 0.0          # 0..1
    source: str | None = None
    as_of: datetime | None = None
    note: str | None = None


@dataclass
class GeoPoint:
    """A located record supplied to a provider (already privacy-filtered by the caller)."""
    lat: float
    lon: float
    status: EvidenceStatus
    confidence: float
    source: str | None = None
    as_of: datetime | None = None
    weight: float = 1.0


@dataclass
class FactorSummary:
    factor: str
    label: str
    status: str            # dominant EvidenceStatus, or "unavailable"
    coverage: float        # fraction of route length with any evidence (0..1)
    value: float | None    # length-weighted mean over covered segments
    confidence: float      # 0..1
    freshest: datetime | None
    message: str
    sources: list[str] = field(default_factory=list)
