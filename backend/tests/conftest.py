import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # repo root, for database.seed

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.core.database import Base, get_db, make_engine
from app.core.security import limiter
from app.main import create_app


@pytest.fixture()
def db_session():
    eng = make_engine("sqlite:///:memory:")
    Base.metadata.create_all(eng)
    S = sessionmaker(bind=eng, autoflush=False, expire_on_commit=False)
    with S() as s:
        yield s


@pytest.fixture()
def client(db_session):
    limiter.reset()
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


@pytest.fixture()
def auth_headers(client):
    client.post("/auth/register", json={"name": "Test User", "email": "t@example.com", "password": "correct-horse-9"})
    tok = client.post("/auth/login", json={"email": "t@example.com", "password": "correct-horse-9"}).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}
