"""Robots and XML sitemap endpoints."""

from datetime import date
from xml.sax.saxutils import escape

from flask import Blueprint, Response, current_app, url_for

from app.content.projects import published_projects

seo_bp = Blueprint("seo", __name__)


@seo_bp.get("/robots.txt")
def robots():
    site_url = current_app.config["SITE_URL"]
    if not current_app.config["ROBOTS_ALLOW_CRAWLING"]:
        body = "User-agent: *\nDisallow: /\n"
    else:
        body = f"User-agent: *\nAllow: /\nSitemap: {site_url}/sitemap.xml\n"
    return Response(body, mimetype="text/plain")


@seo_bp.get("/sitemap.xml")
def sitemap():
    site_url = current_app.config["SITE_URL"]
    static_endpoints = [
        "pages.home",
        "pages.work",
        "pages.services",
        "pages.about",
        "contact.contact",
    ]
    locations = [f"{site_url}{url_for(endpoint)}" for endpoint in static_endpoints]
    locations.extend(
        f"{site_url}{url_for('pages.project_detail', slug=project['slug'])}"
        for project in published_projects()
    )
    lastmod = date.today().isoformat()
    entries = "\n".join(
        f"  <url><loc>{escape(location)}</loc><lastmod>{lastmod}</lastmod></url>"
        for location in locations
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n</urlset>\n"
    )
    return Response(xml, mimetype="application/xml")
