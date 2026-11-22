import pytest

from app import create_app


@pytest.fixture()
def app():
    return create_app(
        {
            "TESTING": True,
            "APP_ENV": "test",
            "SECRET_KEY": "test-secret-key-for-session-and-csrf",
            "WTF_CSRF_ENABLED": False,
            "RATELIMIT_ENABLED": False,
            "MAIL_SERVER": "smtp.example.test",
            "MAIL_PORT": 587,
            "MAIL_USE_TLS": False,
            "MAIL_USE_SSL": False,
            "MAIL_USERNAME": "",
            "MAIL_PASSWORD": "",
            "MAIL_FROM": "website@example.test",
            "MAIL_TO": "owner@example.test",
            "SITE_URL": "https://deltax5.example",
        }
    )


@pytest.fixture()
def client(app):
    return app.test_client()
