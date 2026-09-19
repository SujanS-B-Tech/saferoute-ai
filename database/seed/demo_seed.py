"""Seeds SIMULATED demonstration records around Tamil Nadu city centres.

Every record is tagged verification_status="simulated", named "DEMO ..." and owned by
"SafeRoute AI demo dataset". None of it represents real facilities, CCTV, or patrols.
Run:  python -m database.seed.demo_seed   (from repo root, PYTHONPATH=backend)
"""
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import Base, SessionLocal, engine
from app.models import (CCTVRecord, EmergencyFacility, PoliceStation, PrivacyClass, SafePoint,
                        SafetyDataSource)

# (city, district, centre lat, centre lon) - city centres are real geography; facilities are not.
CITIES = [
    ("Coimbatore", "Coimbatore", 11.0168, 76.9558), ("Chennai", "Chennai", 13.0827, 80.2707),
    ("Madurai", "Madurai", 9.9252, 78.1198), ("Tiruchirappalli", "Tiruchirappalli", 10.7905, 78.7047),
    ("Salem", "Salem", 11.6643, 78.1460), ("Tiruppur", "Tiruppur", 11.1085, 77.3411),
    ("Erode", "Erode", 11.3410, 77.7172), ("Vellore", "Vellore", 12.9165, 79.1325),
    ("Tirunelveli", "Tirunelveli", 8.7139, 77.7567), ("Thoothukudi", "Thoothukudi", 8.7642, 78.1348),
    ("Thanjavur", "Thanjavur", 10.7870, 79.1378), ("Dindigul", "Dindigul", 10.3673, 77.9803),
    ("Hosur", "Krishnagiri", 12.7409, 77.8253), ("Ooty", "The Nilgiris", 11.4102, 76.6950),
]
DEMO_SOURCE = "SafeRoute AI demo dataset (SIMULATED)"
LIMITS = "Simulated for demonstration. Does not describe real infrastructure."


def seed(db) -> dict:
    if db.scalar(select(SafetyDataSource).where(SafetyDataSource.name == DEMO_SOURCE)):
        return {"skipped": True}
    now = datetime.now(timezone.utc)
    src = SafetyDataSource(name=DEMO_SOURCE, factor="police", source_type="simulated",
                           verification_status="simulated", owner="SafeRoute AI", coverage="14 prototype cities (demo)",
                           limitations=LIMITS, confidence=0.5, last_updated=now)
    db.add(src)
    db.flush()
    common = dict(source_id=src.id, verification_status="simulated", confidence=0.5,
                  data_owner="SafeRoute AI demo dataset", verified_at=now)
    n = 0
    for city, district, la, lo in CITIES:
        loc = dict(city=city, district=district, **common)
        db.add_all([
            PoliceStation(name=f"DEMO Police Station — {city} (simulated)", latitude=la + .004, longitude=lo + .003,
                          contact_phone="112", operating_hours="24x7 (simulated)", **loc),
            PoliceStation(name=f"DEMO All-Women Police Station — {city} (simulated)", is_all_women=True,
                          latitude=la - .005, longitude=lo + .002, contact_phone="112", **loc),
            EmergencyFacility(name=f"DEMO Hospital — {city} (simulated)", facility_type="hospital",
                              latitude=la - .003, longitude=lo - .004, contact_phone="108", operating_hours="24x7 (simulated)", **loc),
            SafePoint(name=f"DEMO Bus Terminal — {city} (simulated)", category="bus_terminal",
                      latitude=la + .002, longitude=lo - .005, **loc),
            SafePoint(name=f"DEMO Railway Station — {city} (simulated)", category="railway_station",
                      latitude=la - .001, longitude=lo + .006, **loc),
        ])
        for i in range(6):  # restricted: used by the engine only, never returned by the public API
            db.add(CCTVRecord(latitude=la + .001 * i, longitude=lo + .0015 * i, privacy_class=PrivacyClass.RESTRICTED.value,
                              operator="simulated", **loc))
        n += 11
    for factor, msg in [("cctv", "Simulated CCTV records; real CCTV data requires an authorized partner."),
                        ("safe_points", "Simulated public facilities."),]:
        db.add(SafetyDataSource(name=f"{DEMO_SOURCE} — {factor}", factor=factor, source_type="simulated",
                                verification_status="simulated", owner="SafeRoute AI", coverage="demo cities only",
                                limitations=msg, confidence=0.5, last_updated=now))
    db.commit()
    return {"skipped": False, "records": n}


if __name__ == "__main__":
    import app.models  # noqa: F401
    Base.metadata.create_all(engine)
    with SessionLocal() as s:
        print(seed(s))
