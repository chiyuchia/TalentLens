from app import create_app
from app.extensions import db


def make_app():
    app = create_app(
        {
            "TESTING": True,
            "APP_ACCESS_KEY": "test-key",
            "SECRET_KEY": "test-secret",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        }
    )
    with app.app_context():
        db.create_all()
    return app


def test_health_check():
    client = make_app().test_client()

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "ok"


def test_auth_required_for_business_api():
    client = make_app().test_client()

    response = client.get("/api/candidates")

    assert response.status_code == 401


def test_access_key_login_sets_session():
    client = make_app().test_client()

    response = client.post("/api/auth/login", json={"access_key": "test-key"})

    assert response.status_code == 200
    assert response.get_json()["data"]["authenticated"] is True

    session_response = client.get("/api/auth/session")
    assert session_response.get_json()["data"]["authenticated"] is True


def test_invalid_access_key_is_rejected():
    client = make_app().test_client()

    response = client.post("/api/auth/login", json={"access_key": "wrong"})

    assert response.status_code == 401
