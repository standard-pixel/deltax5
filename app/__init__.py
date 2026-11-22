"""Application factory and shared extensions for DELTAX5."""

from __future__ import annotations

from datetime import datetime, timezone
import secrets

from flask import Flask, g, render_template
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFError, CSRFProtect
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config
from app.content.services import available_services

csrf = CSRFProtect()
limiter = Limiter(key_func=get_remote_address, default_limits=[])


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)
    elif app.config["APP_ENV"] == "production":
        Config.validate()

    if app.config["PROXY_FIX_ENABLED"]:
        app.wsgi_app = ProxyFix(
            app.wsgi_app, x_for=app.config["PROXY_FIX_X_FOR"], x_proto=1
        )

    csrf.init_app(app)
    limiter.init_app(app)

    @app.before_request
    def create_csp_nonce():
        g.csp_nonce = secrets.token_urlsafe(18)

    from app.routes.contact import contact_bp
    from app.routes.pages import pages_bp
    from app.routes.seo import seo_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(contact_bp)
    app.register_blueprint(seo_bp)

    @app.context_processor
    def inject_site_globals() -> dict:
        site_url = app.config["SITE_URL"]
        return {
            "current_year": datetime.now(timezone.utc).year,
            "site_url": site_url,
            "brand_email": "tellahian@gmail.com",
            "brand_phone_display": "+254 769 706 921",
            "brand_phone_e164": "+254769706921",
            "whatsapp_url": "https://wa.me/254769706921",
            "csp_nonce": getattr(g, "csp_nonce", ""),
            "bookable_services": available_services(),
            "structured_data": {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "DELTAX5",
                "url": site_url,
                "email": "tellahian@gmail.com",
                "telephone": "+254769706921",
                "description": (
                    "DELTAX5 is an independent creative identity for video editing, "
                    "visual design and digital creative production."
                ),
                "contactPoint": {
                    "@type": "ContactPoint",
                    "contactType": "project enquiries",
                    "email": "tellahian@gmail.com",
                    "telephone": "+254769706921",
                },
            },
        }

    @app.after_request
    def add_security_headers(response):
        nonce = getattr(g, "csp_nonce", "")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data: https://i.ytimg.com; "
            "media-src 'self'; style-src 'self'; "
            f"script-src 'self' 'nonce-{nonce}'; "
            "frame-src https://www.youtube-nocookie.com; object-src 'none'; "
            "base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        )
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        if app.config["APP_ENV"] == "production":
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response

    @app.errorhandler(CSRFError)
    def handle_csrf_error(error: CSRFError):
        return render_template("pages/error.html", code=400, message="This form expired. Reload the page and try again."), 400

    @app.errorhandler(404)
    def not_found(_error):
        return render_template("pages/error.html", code=404, message="That page could not be found."), 404

    @app.errorhandler(429)
    def too_many_requests(_error):
        return render_template("pages/error.html", code=429, message="Please wait a while before sending another enquiry."), 429

    return app
