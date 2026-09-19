# SafeRoute AI
*Don't just find the shortest route. Find the safest practical route.*

AI-assisted, evidence-aware navigation and emergency-response prototype for Tamil Nadu.
**Assessments are based on available data and never guarantee personal safety. In an emergency call 112.**

## Run the backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
PYTHONPATH=. python -m pytest -q                 # 20 tests
cd .. && PYTHONPATH=backend python -m database.seed.demo_seed   # SIMULATED demo data
cd backend && uvicorn app.main:app --reload      # docs at http://localhost:8000/docs
```
Demo mode is on by default: responses carry `"DEMO MODE — DATA IS SIMULATED"` and all seeded records are labelled `simulated`.

## Run the frontend
```bash
cd frontend && npm install && npm run dev     # http://localhost:5173 (proxies /api -> :8000)
```

## Implemented so far
Auth (JWT, bcrypt, RBAC dependency, rate limiting, audit log) · trusted contacts · privacy settings · full data model ·
routing provider interface (demo/OSRM) · modular safety engine with confidence + explanations · nearby facilities API ·
data-source transparency API · React frontend (landing, auth, route planner + Leaflet map, route comparison with explanations, nearby facilities, data-confidence page, trusted contacts, privacy settings, EN/TA switch). See `docs/ARCHITECTURE.md`.
