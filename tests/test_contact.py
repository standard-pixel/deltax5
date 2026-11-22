from unittest.mock import Mock

from app.routes import contact as contact_routes


def valid_form(**overrides):
    data = {
        "name": "Alex Example",
        "email": "alex@example.com",
        "service": "video-editing",
        "description": "I need a concise edit for a product launch on social media.",
        "budget": "KES 20,000",
        "deadline": "Within three weeks",
        "website": "",
    }
    data.update(overrides)
    return data


def test_valid_enquiry_is_sent_and_redirects(client, monkeypatch):
    send = Mock()
    monkeypatch.setattr(contact_routes, "send_enquiry", send)
    response = client.post("/contact", data=valid_form())
    assert response.status_code == 302
    send.assert_called_once()
    assert send.call_args.args[0]["email"] == "alex@example.com"
    result = client.get(response.headers["Location"])
    assert "Your enquiry has been sent to DELTAX5." in result.get_data(as_text=True)


def test_invalid_email_is_rejected_server_side(client, monkeypatch):
    send = Mock()
    monkeypatch.setattr(contact_routes, "send_enquiry", send)
    response = client.post("/contact", data=valid_form(email="not-an-email"))
    assert response.status_code == 200
    assert "valid email address" in response.get_data(as_text=True).lower()
    send.assert_not_called()


def test_developing_service_cannot_be_submitted_as_bookable(client, monkeypatch):
    send = Mock()
    monkeypatch.setattr(contact_routes, "send_enquiry", send)
    response = client.post("/contact", data=valid_form(service="motion-graphics-vfx"))
    assert response.status_code == 200
    send.assert_not_called()


def test_unconfigured_smtp_does_not_show_success(client):
    with client.application.app_context():
        client.application.config.update(MAIL_SERVER="", MAIL_FROM="", MAIL_TO="")
    response = client.post("/contact", data=valid_form())
    page = response.get_data(as_text=True)
    assert response.status_code == 503
    assert "Your message was not sent" in page
    assert "Your enquiry has been sent" not in page
    assert "Alex Example" in page


def test_mail_failure_is_reported_without_losing_form_values(client, monkeypatch):
    monkeypatch.setattr(contact_routes, "send_enquiry", Mock(side_effect=OSError("offline")))
    response = client.post("/contact", data=valid_form())
    page = response.get_data(as_text=True)
    assert response.status_code == 503
    assert "Your enquiry was not sent" in page
    assert "Alex Example" in page


def test_honeypot_submission_is_rejected(client, monkeypatch):
    send = Mock()
    monkeypatch.setattr(contact_routes, "send_enquiry", send)
    response = client.post("/contact", data=valid_form(website="spam"))
    assert response.status_code == 400
    send.assert_not_called()


def test_csrf_protection_rejects_post_without_token():
    from app import create_app

    app = create_app({"TESTING": True, "APP_ENV": "test", "SECRET_KEY": "csrf-test-secret"})
    response = app.test_client().post("/contact", data=valid_form())
    assert response.status_code == 400
    assert "form expired" in response.get_data(as_text=True).lower()


def test_contact_rate_limit_returns_429_after_five_posts():
    from app import create_app

    app = create_app(
        {
            "TESTING": True,
            "APP_ENV": "test",
            "SECRET_KEY": "rate-limit-test-secret",
            "WTF_CSRF_ENABLED": False,
            "RATELIMIT_ENABLED": True,
            "RATELIMIT_STORAGE_URI": "memory://",
            "MAIL_SERVER": "",
            "MAIL_FROM": "",
            "MAIL_TO": "",
        }
    )
    client = app.test_client()
    statuses = [client.post("/contact", data=valid_form()).status_code for _ in range(6)]
    assert statuses[:5] == [503, 503, 503, 503, 503]
    assert statuses[5] == 429
