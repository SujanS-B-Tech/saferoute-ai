import math
import random

EARTH_R = 6_371_000.0
LatLon = tuple[float, float]


def haversine_m(a: LatLon, b: LatLon) -> float:
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(h))


def polyline_length_m(pts: list[LatLon]) -> float:
    return sum(haversine_m(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def interpolate(a: LatLon, b: LatLon, t: float) -> LatLon:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def split_polyline(pts: list[LatLon], max_len_m: float = 300.0) -> list[list[LatLon]]:
    """Split a polyline into consecutive segments no longer than max_len_m."""
    segments: list[list[LatLon]] = []
    current: list[LatLon] = [pts[0]]
    acc = 0.0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        d = haversine_m(a, b)
        if d == 0:
            continue
        pos = 0.0
        while acc + (d - pos) > max_len_m:
            step = max_len_m - acc
            pos += step
            p = interpolate(a, b, pos / d)
            current.append(p)
            segments.append(current)
            current, acc = [p], 0.0
        acc += d - pos
        current.append(b)
    if len(current) > 1:
        segments.append(current)
    return segments


def midpoint(seg: list[LatLon]) -> LatLon:
    return seg[len(seg) // 2] if len(seg) % 2 else interpolate(seg[len(seg) // 2 - 1], seg[len(seg) // 2], 0.5)


def jitter_coords(lat: float, lon: float, min_offset_deg: float = 0.001, max_offset_deg: float = 0.003) -> tuple[float, float]:
    """Adds a randomized offset to coordinates for masking restricted exact locations.
    Approx 0.001 degrees is ~111 meters.
    """
    lat_jit = random.uniform(min_offset_deg, max_offset_deg)
    lon_jit = random.uniform(min_offset_deg, max_offset_deg)
    
    if random.choice([True, False]): lat_jit = -lat_jit
    if random.choice([True, False]): lon_jit = -lon_jit
        
    return lat + lat_jit, lon + lon_jit


def bbox(pts: list[LatLon], pad_m: float) -> tuple[float, float, float, float]:
    lat_pad = pad_m / 111_320.0
    mid_lat = sum(p[0] for p in pts) / len(pts)
    lon_pad = pad_m / (111_320.0 * max(math.cos(math.radians(mid_lat)), 0.01))
    return (min(p[0] for p in pts) - lat_pad, min(p[1] for p in pts) - lon_pad,
            max(p[0] for p in pts) + lat_pad, max(p[1] for p in pts) + lon_pad)
