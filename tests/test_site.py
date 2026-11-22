from xml.etree import ElementTree

import pytest

from app.content.services import available_services


@pytest.mark.parametrize(
    "path",
    ["/", "/work", "/services", "/about", "/contact", "/robots.txt", "/sitemap.xml"],
)
def test_public_routes_load(client, path):
    response = client.get(path)
    assert response.status_code == 200


def test_unknown_project_is_not_fabricated(client):
    assert client.get("/work/not-a-real-project").status_code == 404


def test_home_has_brand_and_no_project_claims(client):
    response = client.get("/")
    page = response.get_data(as_text=True)
    assert response.status_code == 200
    assert "DELTAX5" in page
    assert "Portfolio in progress" in page
    assert "Testimonial" not in page


def test_services_only_offer_bookable_services_in_form(client):
    response = client.get("/contact")
    page = response.get_data(as_text=True)
    offered = {service["name"] for service in available_services()}
    assert "Video editing" in offered
    assert "Graphic design" in offered
    assert "Cinematic storytelling" not in offered
    assert "Motion graphics and visual effects" not in offered
    assert "Cinematic storytelling" not in page


def test_contact_has_real_contact_links(client):
    page = client.get("/contact").get_data(as_text=True)
    assert "mailto:iantaylor@gmail.com" in page
    assert "tel:+254769706921" in page
    assert "https://wa.me/254769706921" in page


def test_security_headers_are_present(client):
    response = client.get("/")
    assert "default-src 'self'" in response.headers["Content-Security-Policy"]
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_sitemap_is_valid_xml_and_uses_public_base_url(client):
    response = client.get("/sitemap.xml")
    root = ElementTree.fromstring(response.data)
    locations = [element.text for element in root.iter() if element.tag.endswith("loc")]
    assert "https://deltax5.example/" in locations
    assert "https://deltax5.example/contact" in locations
    assert not any("not-a-real-project" in location for location in locations)


def test_robots_blocks_crawling_by_default(client):
    response = client.get("/robots.txt")
    body = response.get_data(as_text=True)
    assert "User-agent: *\nDisallow: /" in body
    assert "Sitemap:" not in body


def test_robots_can_be_enabled_for_public_launch(client, app):
    app.config["ROBOTS_ALLOW_CRAWLING"] = True
    response = client.get("/robots.txt")
    body = response.get_data(as_text=True)
    assert "Allow: /" in body
    assert "Sitemap: https://deltax5.example/sitemap.xml" in body


def test_published_project_filters_detail_and_sitemap(monkeypatch, client):
    from app.content import projects as project_content

    monkeypatch.setattr(
        project_content,
        "PROJECTS",
        [
            {
                "slug": "sample-cut",
                "title": "Sample cut",
                "category": "Video",
                "year": 2026,
                "summary": "A test-only sample entry.",
                "description": "A test-only description for the project route.",
                "contribution": "Editing",
                "tools": ["CapCut"],
                "status": "published",
                "poster": None,
                "alt_text": "Test-only abstract artwork",
            }
        ],
    )

    work = client.get("/work").get_data(as_text=True)
    assert 'data-filter="video"' in work
    assert 'data-category="video"' in work
    assert 'href="/work/sample-cut"' in work

    detail = client.get("/work/sample-cut").get_data(as_text=True)
    assert "Sample cut — DELTAX5" in detail
    assert "A test-only description for the project route." in detail
    assert "Editing" in detail

    sitemap = client.get("/sitemap.xml").get_data(as_text=True)
    assert "https://deltax5.example/work/sample-cut" in sitemap


def test_brand_assets_are_served(client):
    for path in (
        "/static/css/site.css",
        "/static/js/site.js",
        "/static/images/topography.svg",
        "/static/images/favicon.svg",
        "/static/images/og-image.svg",
    ):
        assert client.get(path).status_code == 200


def test_small_text_palette_meets_wcag_aa_on_dark_surfaces():
    def luminance(color):
        channels = [int(color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
        linear = [
            value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
            for value in channels
        ]
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

    def ratio(foreground, background):
        light, dark = sorted((luminance(foreground), luminance(background)), reverse=True)
        return (light + 0.05) / (dark + 0.05)

    muted = "#85827b"
    for surface in ("#090b0d", "#0e1114", "#13171b"):
        assert ratio(muted, surface) >= 4.5


def test_3d_and_magnetic_effects_have_fallbacks(client):
    home = client.get("/").get_data(as_text=True)
    css = client.get("/static/css/site.css").get_data(as_text=True)
    script = client.get("/static/js/site.js").get_data(as_text=True)
    assert 'data-topography-canvas' in home
    assert 'data-tilt="2"' in home
    assert 'prefers-reduced-motion: reduce' in css
    assert '(pointer: coarse)' in css
    assert 'function createTerrain' in script
    assert 'document.querySelectorAll(".magnetic")' in script
