"""Pluggable evidence providers.

To add a data source: implement `EvidenceProvider.evaluate(segment, ctx) -> Evidence`
and register it in `default_providers()`. Providers must return status=UNAVAILABLE
(never a made-up value) when they have no data.
"""
from abc import ABC, abstractmethod
from typing import Sequence

from app.services.geo import haversine_m
from app.services.safety.types import (Evidence, EvidenceStatus, EvaluationContext,
                                       GeoPoint, Segment)

FACTOR_LABELS = {
    "cctv": "CCTV information",
    "police": "Police station proximity",
    "safe_points": "Safe points / public facilities",
    "lighting": "Street lighting",
    "patrol": "Verified patrol information",
    "public_activity": "Public activity indicators",
    "emergency_access": "Emergency facility accessibility",
    "transit": "Public transport availability",
}


class EvidenceProvider(ABC):
    factor: str

    @abstractmethod
    def evaluate(self, segment: Segment, ctx: EvaluationContext) -> Evidence: ...


class NearbyPointsProvider(EvidenceProvider):
    """Generic provider: support grows with the number/quality of nearby located records.

    `dataset_available=False` (no records loaded for the area) yields UNAVAILABLE.
    Absence of a nearby record is NOT evidence of unsafety, so it yields a low
    value with reduced confidence, scaled by `coverage_confidence`.
    """

    def __init__(self, factor: str, points: Sequence[GeoPoint], radius_m: float,
                 saturation: float = 2.0, coverage_confidence: float = 0.6):
        self.factor, self.points = factor, list(points)
        self.radius_m, self.saturation = radius_m, saturation
        self.coverage_confidence = coverage_confidence

    def evaluate(self, segment: Segment, ctx: EvaluationContext) -> Evidence:
        if not self.points:
            return Evidence(self.factor, EvidenceStatus.UNAVAILABLE,
                            note="No records loaded for this area.")
        near = [p for p in self.points if haversine_m(segment.mid, (p.lat, p.lon)) <= self.radius_m]
        if not near:
            return Evidence(self.factor, EvidenceStatus.ESTIMATED, value=0.0,
                            confidence=self.coverage_confidence * 0.5,
                            note="No mapped records nearby; the dataset may be incomplete.")
        support = min(1.0, sum(p.weight * p.confidence for p in near) / self.saturation)
        # Weakest-link status: a mix is only as trustworthy as its least verified member.
        order = [EvidenceStatus.SIMULATED, EvidenceStatus.USER_REPORTED,
                 EvidenceStatus.ESTIMATED, EvidenceStatus.VERIFIED]
        status = min((p.status for p in near), key=order.index)
        dated = [p.as_of for p in near if p.as_of]
        return Evidence(
            self.factor, status, value=support,
            confidence=min(1.0, self.coverage_confidence * (sum(p.confidence for p in near) / len(near))),
            source=", ".join(sorted({p.source for p in near if p.source})) or None,
            as_of=max(dated) if dated else None,
            note=f"{len(near)} mapped record(s) within {int(self.radius_m)} m.",
        )


class UnavailableProvider(EvidenceProvider):
    """Explicit placeholder for factors with no data feed yet (patrol, lighting...)."""

    def __init__(self, factor: str, message: str):
        self.factor, self.message = factor, message

    def evaluate(self, segment: Segment, ctx: EvaluationContext) -> Evidence:
        return Evidence(self.factor, EvidenceStatus.UNAVAILABLE, note=self.message)


def default_providers(*, police: Sequence[GeoPoint], safe_points: Sequence[GeoPoint],
                      cctv: Sequence[GeoPoint], facilities: Sequence[GeoPoint],
                      lighting: Sequence[GeoPoint] = (), transit: Sequence[GeoPoint] = ()
                      ) -> list[EvidenceProvider]:
    return [
        NearbyPointsProvider("police", police, radius_m=1500, saturation=1.0),
        NearbyPointsProvider("safe_points", safe_points, radius_m=600, saturation=2.0),
        NearbyPointsProvider("cctv", cctv, radius_m=150, saturation=3.0, coverage_confidence=0.5),
        NearbyPointsProvider("emergency_access", facilities, radius_m=2500, saturation=1.0),
        NearbyPointsProvider("lighting", lighting, radius_m=60, saturation=2.0) if lighting
        else UnavailableProvider("lighting", "Street-lighting data is not available for this area."),
        NearbyPointsProvider("transit", transit, radius_m=400, saturation=2.0) if transit
        else UnavailableProvider("transit", "Public transport stop data is not loaded."),
        UnavailableProvider("patrol", "Live patrol data is not currently available."),
    ]
