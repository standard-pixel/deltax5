from email.message import EmailMessage
from unittest.mock import Mock

import smtplib

from app.services import mailer


def test_mailer_uses_plain_text_and_verified_reply_to(app, monkeypatch):
    fake_smtp = Mock()
    fake_smtp.__enter__ = Mock(return_value=fake_smtp)
    fake_smtp.__exit__ = Mock(return_value=False)
    monkeypatch.setattr(smtplib, "SMTP", Mock(return_value=fake_smtp))
    with app.app_context():
        app.config.update(MAIL_USE_TLS=False)
        mailer.send_enquiry(
            {
                "name": "Demo Visitor",
                "email": "demo@example.com",
                "service_name": "Video editing",
                "description": "A short example enquiry for a test.",
                "budget": "",
                "deadline": "",
            }
        )
    message = fake_smtp.send_message.call_args.args[0]
    assert isinstance(message, EmailMessage)
    assert message["To"] == "owner@example.test"
    assert message["Reply-To"] == "demo@example.com"
    assert message.get_content_type() == "text/plain"
    assert "Demo Visitor" in message.get_content()
