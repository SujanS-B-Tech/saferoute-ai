from database.seed.demo_seed import seed

CBE = {"lat": 11.0168, "lon": 76.9558}


def test_register_login_me_and_no_role_escalation(client):
    r = client.post("/auth/register", json={"name": "A", "email": "A@Example.com", "password": "longenough1", "role": "super_admin"})
    assert r.status_code == 201 and r.json()["role"] == "standard_user" and "password" not in r.text
    assert client.post("/auth/register", json={"name": "A", "email": "a@example.com", "password": "longenough1"}).status_code == 409
    tok = client.post("/auth/login", json={"email": "a@example.com", "password": "longenough1"}).json()["access_token"]
    assert client.get("/users/me", headers={"Authorization": f"Bearer {tok}"}).json()["email"] == "a@example.com"


def test_bad_login_and_weak_password(client):
    assert client.post("/auth/register", json={"name": "A", "email": "b@example.com", "password": "short"}).status_code == 422
    assert client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever123"}).status_code == 401


def test_protected_routes_need_token(client):
    assert client.get("/users/me").status_code == 401
    assert client.get("/users/me", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_auth_rate_limit(client):
    codes = [client.post("/auth/login", json={"email": "x@example.com", "password": "nope-nope-1"}).status_code for _ in range(12)]
    assert 429 in codes


def test_contacts_are_private_and_capped(client, auth_headers):
    for i in range(5):
        assert client.post("/users/me/contacts", headers=auth_headers, json={"name": f"C{i}", "phone": "9876543210"}).status_code == 201
    assert client.post("/users/me/contacts", headers=auth_headers, json={"name": "C6", "phone": "9876543210"}).status_code == 400


def test_facilities_labelled_and_no_cctv_leak(client, db_session):
    seed(db_session)
    r = client.get("/facilities/nearby", params={**CBE, "radius_m": 3000})
    data = r.json()
    assert data and all(f["verification_status"] == "simulated" and "DEMO" in f["name"] for f in data)
    assert not any("cctv" in f["kind"] for f in data)
    assert data == sorted(data, key=lambda f: f["distance_m"])
    assert all("guaranteed safe" not in f["label"].lower() for f in data)


def test_facilities_empty_when_no_data(client):
    assert client.get("/facilities/nearby", params=CBE).json() == []


def test_route_plan_demo_is_labelled(client, db_session, auth_headers):
    seed(db_session)
    body = {"origin": CBE, "destination": {"lat": 11.0268, "lon": 76.9758}, "mode": "walking"}
    r = client.post("/routes/plan", json=body, headers=auth_headers)
    assert r.status_code == 200
    j = r.json()
    assert j["demo_banner"] == "DEMO MODE — DATA IS SIMULATED" and j["geometry_simulated"] is True
    assert len(j["routes"]) == 3
    for rt in j["routes"]:
        assert rt["safety_guarantee"] is False and rt["contains_simulated_data"] is True
        assert rt["data_confidence"] in ("insufficient", "low", "moderate", "high")
        assert "geometry" in rt and rt["summary"]


def test_route_plan_requires_auth_and_validates(client, auth_headers):
    assert client.post("/routes/plan", json={}).status_code == 401
    assert client.post("/routes/plan", json={"origin": {"lat": 999, "lon": 0}, "destination": CBE}, headers=auth_headers).status_code == 422


def test_safety_sources_report_unavailable_honestly(client):
    src = {s["factor"]: s for s in client.get("/safety/sources").json()}
    assert src["patrol"]["status"] == "unavailable" and "not currently available" in src["patrol"]["message"]
