"""Explainable, evidence-aware route assessment.

Design principles
- Missing data is never treated as "unsafe": unavailable factors are excluded from
  the model score and instead LOWER the data confidence.
- Model score (0..1, "support from available data"), data confidence, and safety
  guarantee are three separate things. The guarantee is always False.
- Time of day is reported as context; it applies to every alternative equally, so it
  does not change the ranking.
"""
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Sequence

from app.services.geo import LatLon, midpoint, polyline_length_m, split_polyline
from app.services.safety.providers import FACTOR_LABELS, EvidenceProvider
from app.services.safety.types import (EvaluationContext, Evidence, EvidenceStatus,
                                       FactorSummary, Segment)

IST = timezone(timedelta(hours=5, minutes=30))

DISCLAIMER = ("This assessment is based on available data and cannot guarantee personal safety. "
              "In an emergency, call 112.")

FACTOR_WEIGHTS = {"lighting": 0.20, "safe_points": 0.20, "police": 0.15, "cctv": 0.15,
                  "emergency_access": 0.10, "transit": 0.10, "patrol": 0.10}

METHODOLOGY = (
    "Model score = weighted mean of factor values (0-1) over factors that have data; factors "
    "without data are excluded, not scored as zero. Data confidence = weighted mean of "
    "(source confidence x route coverage) over ALL factors, so missing data lowers confidence. "
    "The score measures support from available data, not the probability of harm."
)


@dataclass
class RouteCandidate:
    id: str
    points: list[LatLon]
    distance_m: float
    duration_s: float
    simulated_geometry: bool = False


@dataclass
class RouteAssessment:
    route_id: str
    distance_m: float
    duration_s: float
    model_score: float | None
    data_confidence: str            # insufficient | low | moderate | high
    data_confidence_value: float
    summary: str = ""
    factors: list[FactorSummary] = field(default_factory=list)
    context_notes: list[str] = field(default_factory=list)
    contains_simulated_data: bool = False
    safety_guarantee: bool = False  # never True
    disclaimer: str = DISCLAIMER
    methodology: str = METHODOLOGY

    def to_dict(self) -> dict:
        return asdict(self)


def make_segments(points: list[LatLon], max_len_m: float = 300.0) -> list[Segment]:
    return [Segment(i, s, polyline_length_m(s), midpoint(s))
            for i, s in enumerate(split_polyline(points, max_len_m)) if len(s) > 1]


def _confidence_label(v: float) -> str:
    if v < 0.10:
        return "insufficient"
    if v < 0.30:
        return "low"
    if v < 0.55:
        return "moderate"
    return "high"


_STATUS_ORDER = [EvidenceStatus.SIMULATED, EvidenceStatus.USER_REPORTED,
                 EvidenceStatus.ESTIMATED, EvidenceStatus.VERIFIED]


def _summarise_factor(factor: str, per_segment: list[tuple[Segment, Evidence]], total_len: float
                      ) -> FactorSummary:
    label = FACTOR_LABELS.get(factor, factor)
    have = [(s, e) for s, e in per_segment if e.status != EvidenceStatus.UNAVAILABLE and e.value is not None]
    if not have or total_len == 0:
        note = next((e.note for _, e in per_segment if e.note), "Data unavailable.")
        return FactorSummary(factor, label, "unavailable", 0.0, None, 0.0, None,
                             f"{label}: data unavailable. {note}")
    cov_len = sum(s.length_m for s, _ in have)
    coverage = cov_len / total_len
    value = sum(s.length_m * e.value for s, e in have) / cov_len
    conf = sum(s.length_m * e.confidence for s, e in have) / cov_len
    status = min((e.status for _, e in have), key=_STATUS_ORDER.index)
    dates = [e.as_of for _, e in have if e.as_of]
    sources = sorted({e.source for _, e in have if e.source})
    cov_word = "broad" if coverage >= 0.75 else "partial" if coverage >= 0.35 else "limited"
    msg = f"{label}: {cov_word} coverage ({round(coverage * 100)}% of route), {status.value} data."
    return FactorSummary(factor, label, status.value, round(coverage, 3), round(value, 3),
                         round(conf, 3), max(dates) if dates else None, msg, sources)


def evaluate_route(candidate: RouteCandidate, providers: Sequence[EvidenceProvider],
                   ctx: EvaluationContext) -> RouteAssessment:
    segments = make_segments(candidate.points)
    total = sum(s.length_m for s in segments)
    summaries: list[FactorSummary] = []
    for p in providers:
        per_seg = [(s, p.evaluate(s, ctx)) for s in segments]
        summaries.append(_summarise_factor(p.factor, per_seg, total))

    scored = [(FACTOR_WEIGHTS.get(f.factor, 0.05), f) for f in summaries if f.value is not None and f.coverage >= 0.2]
    wsum = sum(w for w, _ in scored)
    score = round(sum(w * f.value for w, f in scored) / wsum, 3) if wsum else None

    all_w = sum(FACTOR_WEIGHTS.get(f.factor, 0.05) for f in summaries) or 1.0
    conf_val = sum(FACTOR_WEIGHTS.get(f.factor, 0.05) * f.confidence * f.coverage for f in summaries) / all_w
    conf_val = round(conf_val, 3)
    conf_label = _confidence_label(conf_val)

    simulated = any(f.status == "simulated" for f in summaries) or ctx.demo_mode
    notes = _context_notes(ctx)
    return RouteAssessment(
        route_id=candidate.id, distance_m=round(candidate.distance_m), duration_s=round(candidate.duration_s),
        model_score=score, data_confidence=conf_label, data_confidence_value=conf_val,
        factors=summaries, context_notes=notes, contains_simulated_data=simulated,
    )


def _context_notes(ctx: EvaluationContext) -> list[str]:
    local = ctx.departure.astimezone(IST)
    notes = []
    if local.hour >= 19 or local.hour < 5:
        notes.append("Night-time travel: street lighting and public activity matter more. "
                     "Consider sharing your journey with a trusted contact.")
    if local.weekday() >= 5:
        notes.append("Weekend: public activity patterns may differ from weekdays.")
    return notes


def compare_routes(assessments: list[RouteAssessment], preference: str = "balanced",
                   min_margin: float = 0.05) -> list[RouteAssessment]:
    """Fill neutral summaries, and return assessments ordered per the user's preference.

    The ordering is a convenience, not a claim that the first route is 'the safest'.
    """
    if not assessments:
        return []
    fastest = min(a.duration_s for a in assessments) or 1
    shortest = min(a.distance_m for a in assessments) or 1
    scored = [a for a in assessments if a.model_score is not None and a.data_confidence != "insufficient"]
    best = max(scored, key=lambda a: a.model_score) if scored else None

    for a in assessments:
        extra_min = round((a.duration_s - fastest) / 60)
        extra_km = (a.distance_m - shortest) / 1000
        trade = f" (+{extra_min} min, +{extra_km:.1f} km vs. the quickest/shortest option)" if extra_min > 0 or extra_km > 0.05 else ""
        if a.model_score is None or a.data_confidence == "insufficient":
            a.summary = "Not enough data to assess this route." + trade
        elif best and len(scored) > 1:
            others = [x.model_score for x in scored if x is not a]
            if a is best and a.model_score - max(others) >= min_margin:
                a.summary = "Better supported by available safety data" + trade
            elif best.model_score - a.model_score >= min_margin:
                a.summary = ("Less supported by available safety data — this does not mean the route is unsafe" + trade)
            else:
                a.summary = "Similar support from available data to the alternatives" + trade
        else:
            a.summary = "Assessed using available data; no comparable alternative" + trade

    def key(a: RouteAssessment) -> float:
        s = a.model_score if (a.model_score is not None and a.data_confidence != "insufficient") else 0.0
        t = min(a.duration_s / fastest, 2.0)  # cap so one long detour can't dominate
        d = a.distance_m / shortest
        if preference == "safety_priority":
            return -(0.8 * s - 0.2 * (t - 1))
        if preference == "accessibility_priority":
            return d  # road-accessibility data is not modelled yet; prefer the more direct route
        return -(0.5 * s - 0.5 * (t - 1))

    return sorted(assessments, key=key)
