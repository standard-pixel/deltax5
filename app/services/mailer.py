"""SMTP delivery for project enquiries."""

from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage

from flask import current_app


def mail_is_configured() -> bool:
    config = current_app.config
    required = ("MAIL_SERVER", "MAIL_FROM", "MAIL_TO")
    if not all(str(config.get(key, "")).strip() for key in required):
        return False
    if config.get("MAIL_USERNAME") and not config.get("MAIL_PASSWORD"):
        return False
    if config.get("MAIL_USE_TLS") and config.get("MAIL_USE_SSL"):
        return False
    return True


def send_enquiry(data: dict[str, str]) -> None:
    """Send a plain-text enquiry and raise on any delivery error."""
    if not mail_is_configured():
        raise RuntimeError("SMTP is not configured.")

    config = current_app.config
    message = EmailMessage()
    message["Subject"] = "New DELTAX5 project enquiry"
    message["From"] = config["MAIL_FROM"]
    message["To"] = config["MAIL_TO"]
    message["Reply-To"] = data["email"]
    message.set_content(
        "A new project enquiry was submitted through the DELTAX5 website.\n\n"
        f"Name: {data['name']}\n"
        f"Email: {data['email']}\n"
        f"Service: {data['service_name']}\n"
        f"Budget: {data.get('budget') or 'Not provided'}\n"
        f"Deadline: {data.get('deadline') or 'Not provided'}\n\n"
        "Project description:\n"
        f"{data['description']}\n"
    )

    context = ssl.create_default_context()
    timeout = config.get("MAIL_TIMEOUT", 12)
    if config.get("MAIL_USE_SSL"):
        smtp = smtplib.SMTP_SSL(
            config["MAIL_SERVER"], config["MAIL_PORT"], timeout=timeout, context=context
        )
    else:
        smtp = smtplib.SMTP(config["MAIL_SERVER"], config["MAIL_PORT"], timeout=timeout)
    with smtp:
        smtp.ehlo()
        if config.get("MAIL_USE_TLS"):
            smtp.starttls(context=context)
            smtp.ehlo()
        if config.get("MAIL_USERNAME"):
            smtp.login(config["MAIL_USERNAME"], config["MAIL_PASSWORD"])
        smtp.send_message(message)
