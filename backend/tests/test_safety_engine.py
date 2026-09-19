from datetime import datetime, timezone

from app.services.geo import haversine_m, split_polyline
from app.services.safety import (EvaluationContext, EvidenceStatus, GeoPoint, RouteCandidate,
                                 compare_routes, default_providers, evaluate_route)

A, B = (11.0168, 76.9558), (11.0168, 76.9758)  # ~2.2 km east-west
NOON = datetime(2026, 9, 21, 6, 30, tzinfo=timezone.utc)  # 12:00 IST
NIGHT = datetime(2026, 9, 21, 16, 30, tzinfo=timezone.utc)  # 22:00 IST
CTX = EvaluationContext(NOON)


def route(rid, pts, speed=1.3):
    d = sum(haversine_m(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    return RouteCandidate(rid, pts, d, d / speed)


def pts_along(n=4, lat=11.0168):
    return [GeoPoint(lat, 76.9558 + i * 0.005, EvidenceStatus.VERIFIED, 0.9, "gov", NOON) for i in range(n)]


def providers(**kw):
    base = dict(police=[], safe_points=[], cctv=[], facilities=[])
    base.update(kw)
    return default_providers(**base)


def test_split_polyline_respects_max_length():
    segs = split_polyline([A, B], 300)
    assert all(haversine_m(s[0], s[-1]) <= 301 for s in segs)
    assert abs(sum(haversine_m(s[0], s[-1]) for s in segs) - haversine_m(A, B)) < 5


def test_no_data_means_no_score_and_insufficient_confidence():
    a = evaluate_route(route("r", [A, B]), providers(), CTX)
    assert a.model_score is None
    assert a.data_confidence == "insufficient"
    assert all(f.status == "unavailable" for f in a.factors)


def test_never_claims_guarantee_and_states_patrol_unavailable():
    a = evaluate_route(route("r", [A, B]), providers(police=pts_along()), CTX)
    assert a.safety_guarantee is False
    assert "cannot guarantee" in a.disclaimer
    patrol = next(f for f in a.factors if f.factor == "patrol")
    assert patrol.status == "unavailable" and "not currently available" in patrol.message


def test_more_support_gives_higher_score_and_confidence():
    r = route("r", [A, B])
    poor = evaluate_route(r, providers(police=pts_along(1)[:1]), CTX)
    rich = evaluate_route(r, providers(police=pts_along(), safe_points=pts_along(), cctv=pts_along(), facilities=pts_along()), CTX)
    assert rich.model_score > poor.model_score
    assert rich.data_confidence_value > poor.data_confidence_value


def test_unavailable_factors_reduce_confidence_but_not_score():
    r = route("r", [A, B])
    full = providers(police=pts_along(), safe_points=pts_along(), cctv=pts_along(), facilities=pts_along())
    only_police = providers(police=pts_along())
    a, b = evaluate_route(r, full, CTX), evaluate_route(r, only_police, CTX)
    assert b.data_confidence_value < a.data_confidence_value
    assert b.model_score is not None and b.model_score >= 0.9  # not dragged down by absent factors


def test_simulated_data_is_flagged():
    sim = [GeoPoint(p.lat, p.lon, EvidenceStatus.SIMULATED, 0.5, "demo", NOON) for p in pts_along()]
    a = evaluate_route(route("r", [A, B]), providers(police=sim), EvaluationContext(NOON, demo_mode=True))
    assert a.contains_simulated_data
    assert next(f for f in a.factors if f.factor == "police").status == "simulated"


def test_mixed_status_uses_weakest_link():
    mixed = pts_along()
    mixed[1] = GeoPoint(mixed[1].lat, mixed[1].lon, EvidenceStatus.ESTIMATED, 0.5, "osm", NOON)
    a = evaluate_route(route("r", [A, B]), providers(police=mixed), CTX)
    assert next(f for f in a.factors if f.factor == "police").status in ("estimated", "verified")


def test_night_context_note_present():
    a = evaluate_route(route("r", [A, B]), providers(), EvaluationContext(NIGHT))
    assert any("Night-time" in n for n in a.context_notes)
    assert not evaluate_route(route("r", [A, B]), providers(), CTX).context_notes


def test_compare_uses_neutral_wording_and_reports_tradeoffs():
    direct = route("direct", [A, B])
    detour = route("detour", [A, (11.0268, 76.9658), B], speed=1.3)
    prov = providers(police=[GeoPoint(11.0268, 76.9658, EvidenceStatus.VERIFIED, 0.9, "gov", NOON)],
                     safe_points=[GeoPoint(11.0268, 76.9658, EvidenceStatus.VERIFIED, 0.9, "gov", NOON)])
    out = compare_routes([evaluate_route(direct, prov, CTX), evaluate_route(detour, prov, CTX)], "safety_priority")
    by = {a.route_id: a for a in out}
    assert "Better supported" in by["detour"].summary and "min" in by["detour"].summary
    assert "does not mean the route is unsafe" in by["direct"].summary
    assert "safest" not in " ".join(a.summary for a in out).lower()
    assert out[0].route_id == "detour"  # safety priority ordering


def test_score_is_separate_from_confidence_in_output():
    d = evaluate_route(route("r", [A, B]), providers(police=pts_along()), CTX).to_dict()
    assert {"model_score", "data_confidence", "safety_guarantee", "methodology"} <= d.keys()
