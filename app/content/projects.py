"""Published portfolio entries. Add a real, approved project to publish it."""

PROJECTS: list[dict] = []


def published_projects() -> list[dict]:
    return [project for project in PROJECTS if project.get("status") == "published"]


def project_by_slug(slug: str) -> dict | None:
    return next(
        (project for project in published_projects() if project["slug"] == slug), None
    )


def project_categories() -> list[str]:
    return sorted({project["category"] for project in published_projects()})
