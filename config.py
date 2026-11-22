"""Environment-backed configuration for DELTAX5."""

from __future__ import annotations

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY") or secrets.token_urlsafe(48)
    SITE_URL = (
        os.getenv("SITE_URL")
        or os.getenv("RENDER_EXTERNAL_URL")
        or "http://127.0.0.1:5000"
    ).rstrip("/")
    ROBOTS_ALLOW_CRAWLING = _as_bool(os.getenv("ROBOTS_ALLOW_CRAWLING"), default=False)
    MAX_CONTENT_LENGTH = 32 * 1024

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = APP_ENV == "production"
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600

    MAIL_SERVER = os.getenv("MAIL_SERVER", "").strip()
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = _as_bool(os.getenv("MAIL_USE_TLS"), default=True)
    MAIL_USE_SSL = _as_bool(os.getenv("MAIL_USE_SSL"), default=False)
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "").strip()
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM = os.getenv("MAIL_FROM", "").strip()
    MAIL_TO = os.getenv("MAIL_TO", "iantaylor@gmail.com").strip()
    MAIL_TIMEOUT = 12

    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://").strip()
    RATELIMIT_HEADERS_ENABLED = True
    PROXY_FIX_ENABLED = _as_bool(os.getenv("PROXY_FIX_ENABLED"), default=False)
    PROXY_FIX_X_FOR = int(os.getenv("PROXY_FIX_X_FOR", "1"))
    RATELIMIT_DEFAULT = []

    @classmethod
    def validate(cls) -> None:
        if cls.APP_ENV == "production":
            if not os.getenv("FLASK_SECRET_KEY"):
                raise RuntimeError("FLASK_SECRET_KEY must be set in production.")
            if cls.RATELIMIT_STORAGE_URI.startswith("memory://"):
                raise RuntimeError(
                    "Set RATELIMIT_STORAGE_URI to shared storage (for example Redis) in production."
                )
            if cls.MAIL_USE_TLS and cls.MAIL_USE_SSL:
                raise RuntimeError("Enable either SMTP TLS or SMTP SSL, not both.")
        if cls.PROXY_FIX_ENABLED and cls.PROXY_FIX_X_FOR < 1:
            raise RuntimeError("PROXY_FIX_X_FOR must be at least 1 when proxy headers are enabled.")
