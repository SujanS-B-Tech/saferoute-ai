# SafeRoute AI — Architecture (Phase 1)

## Layers
React/Vite/TS (Leaflet) → FastAPI REST → services (routing provider, safety engine, geo queries) → SQLAlchemy → SQLite (dev) / PostgreSQL+PostGIS (prod).

## Key decisions
1. **Evidence, not vibes.** Each factor provider returns `Evidence(status, value, confidence, source, as_of)`. Missing data is `UNAVAILABLE` — excluded from the score, lowers confidence.
2. **Three separate outputs:** `model_score` (support from available data), `data_confidence` (insufficient/low/moderate/high), `safety_guarantee` (always false).
3. **Weakest-link labelling.** A factor mixing verified and simulated records is labelled simulated.
4. **Neutral wording.** "Better supported by available safety data" / "Less supported … does not mean the route is unsafe". Never "safest"/"dangerous".
5. **Time of day is context**, shown as notes; it affects all alternatives equally so it does not reorder them.
6. **Privacy by design.** CCTV rows are `restricted`: used inside the engine, never returned by any public endpoint. Patrol info is area-level, time-bounded, `confidential`. Location history retention defaults to 0 days.
7. **Provider interfaces** for routing (`demo`, `osrm`) and evidence (`EvidenceProvider`) so authorized data can be plugged in later.
8. **Emergency = mock.** `EmergencyAlert.is_mock` is true until an authorized dispatch integration exists; UI must say so.

## Schema (models in `backend/app/models/__init__.py`)
- **Identity:** `User` (role, language, location permission, retention), `EmergencyContact` (explicit live-location consent flag), `AuditLog`.
- **Provenance:** `SafetyDataSource` (factor, type, status, owner, coverage, limitations, confidence). Every geo record links to a source and carries `verification_status`, `confidence`, `data_owner`, `privacy_class`, `verified_at`, plus district/city/locality (state→district→city→locality→segment).
- **Facilities/evidence:** `PoliceStation` (All-Women flag), `EmergencyFacility`, `SafePoint`, `CCTVRecord`, `PatrolInformation`, `SafetyIndicator` (lighting, activity, isolation).
- **Routing:** `Route`, `RouteSegment` (per-segment evidence JSON), `Journey` (sharing consent, expiry).
- **Community/Emergency:** `CommunityReport` (moderation status, duplicate link), `EmergencyAlert`.
Indexes: lat/lon, city, district, factor, status, user FKs, audit time/action. PostGIS migration: add `geography(Point,4326)` + GiST index and use `ST_DWithin`.

## Phase status
| Phase | Status |
|---|---|
| 1 Architecture | Done |
| 2 Setup | Done (backend + frontend) |
| 3 Auth + models | Done |
| 4 Map + route search | Done (click-to-place points; address geocoding pending) |
| 5–6 Engine + explainability | Done (backend, tested) |
| 7 Navigation/journeys | Next |
| 8 SOS · 9 Community · 10 Admin | Next |
| 11 Hardening/docs · 12 Polish | Later |
