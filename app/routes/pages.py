"""Public content pages and project detail route."""

from flask import Blueprint, abort, render_template

from app.content.projects import project_by_slug, project_categories, published_projects
from app.content.services import SERVICES

pages_bp = Blueprint("pages", __name__)


@pages_bp.get("/")
def home():
    projects = published_projects()
    return render_template(
        "pages/home.html",
        title="DELTAX5 — Create beyond the ordinary",
        description="An independent creative identity for video editing, visual design and digital creative production.",
        projects=projects[:3],
        services=SERVICES,
    )


@pages_bp.get("/work")
def work():
    projects = published_projects()
    return render_template(
        "pages/work.html",
        title="Selected work — DELTAX5",
        description="Explore selected video, motion and visual design projects from DELTAX5.",
        projects=projects,
        categories=project_categories(),
    )


@pages_bp.get("/work/<slug>")
def project_detail(slug: str):
    project = project_by_slug(slug)
    if not project:
        abort(404)
    return render_template(
        "pages/project.html",
        title=f"{project['title']} — DELTAX5",
        description=project.get("summary", "A selected creative project by DELTAX5."),
        project=project,
    )


@pages_bp.get("/services")
def services():
    return render_template(
        "pages/services.html",
        title="Creative services — DELTAX5",
        description="Video editing, social content and visual design, with developing creative and technical capabilities.",
        services=SERVICES,
    )


@pages_bp.get("/about")
def about():
    return render_template(
        "pages/about.html",
        title="About DELTAX5 — Creative beyond the ordinary",
        description="The creative philosophy and approach behind DELTAX5.",
    )
