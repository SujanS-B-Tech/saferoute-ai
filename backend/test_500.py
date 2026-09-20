import sys
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine

# ensure tables are created
import app.models
Base.metadata.create_all(bind=engine)

client = TestClient(app)
response = client.post("/auth/register", json={
    "name": "Test User",
    "email": "testx@example.com",
    "password": "Password123",
    "phone": "1234567890",
    "preferred_language": "en"
})

print("STATUS:", response.status_code)
print("BODY:", response.text)
