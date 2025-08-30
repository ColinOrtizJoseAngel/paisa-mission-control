import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app, get_db
import models

# --- Test Database Setup ---
# Use an in-memory SQLite database for fast, isolated tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables in the test database
models.Base.metadata.create_all(bind=engine)

# --- Dependency Override ---
# This function will replace the original get_db in the tests
def override_get_db():
    database = None
    try:
        database = TestingSessionLocal()
        yield database
    finally:
        if database:
            database.close()

# Tell the app to use our test database instead of the real one
app.dependency_overrides[get_db] = override_get_db

# --- Test Client ---
client = TestClient(app)

# --- Unit Tests ---

def test_create_user_success():
    """
    Tests successful user registration.
    """
    response = client.post(
        "/register/",
        json={"name": "Test User", "email": "test@example.com", "password": "testpassword"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data
    assert "hashed_password" not in data


def test_create_user_duplicate_email():
    """
    Tests that the API prevents registration with a duplicate email.
    """
    # Create the first user
    client.post(
        "/register/",
        json={"name": "Jane Doe", "email": "jane.doe@example.com", "password": "password123"},
    )
    
    # Attempt to create a second user with the same email
    response = client.post(
        "/register/",
        json={"name": "Jane Doe Clone", "email": "jane.doe@example.com", "password": "anotherpassword"},
    )
    
    assert response.status_code == 400, response.text
    data = response.json()
    assert data["detail"] == "Email already registered"
