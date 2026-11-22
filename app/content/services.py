"""Service catalog. Only entries marked available can be booked."""

SERVICES = [
    {
        "slug": "video-editing",
        "name": "Video editing",
        "category": "Video",
        "status": "available",
        "status_label": "Available",
        "tool": "CapCut",
        "summary": "A considered edit shaped from footage you provide.",
        "audience": "Creators and small teams with footage ready to shape for digital channels.",
        "deliverables": [
            "An edited video in an agreed format",
            "A review export for feedback",
            "A final digital export",
        ],
        "note": "Filming and on-location capture are not included.",
    },
    {
        "slug": "social-content",
        "name": "Social content",
        "category": "Social",
        "status": "available",
        "status_label": "Available",
        "tool": "CapCut + Canva",
        "summary": "A coordinated mix of edited clips and designed social graphics.",
        "audience": "Independent creators and small businesses preparing content for social platforms.",
        "deliverables": [
            "Short-form video edits from supplied footage",
            "A set of static social graphics",
            "Exports sized for agreed platforms",
        ],
        "note": "The scope and number of assets are agreed before work begins.",
    },
    {
        "slug": "graphic-design",
        "name": "Graphic design",
        "category": "Design",
        "status": "available",
        "status_label": "Available",
        "tool": "Canva",
        "summary": "Clear, purposeful visual design for digital use.",
        "audience": "Creators and small teams who need focused digital graphics.",
        "deliverables": [
            "Designed digital assets in agreed dimensions",
            "A review export for feedback",
            "Final files ready for digital publishing",
        ],
        "note": "Print production and source-file handoff are confirmed per project.",
    },
    {
        "slug": "cinematic-storytelling",
        "name": "Cinematic storytelling",
        "category": "Video",
        "status": "developing",
        "status_label": "In development",
        "tool": "Editing craft",
        "summary": "Story-led pacing and cinematic treatments are a developing capability.",
        "audience": "Project ideas that benefit from a more considered visual narrative.",
        "deliverables": ["Exploratory scope only; not currently a standalone bookable service."],
        "note": "Availability will be updated as this capability develops.",
    },
    {
        "slug": "motion-graphics-vfx",
        "name": "Motion graphics and visual effects",
        "category": "Motion",
        "status": "developing",
        "status_label": "In development",
        "tool": "Motion + compositing",
        "summary": "Motion-led graphics and visual effects are being developed as part of the studio practice.",
        "audience": "Concepts that call for animated titles, graphic movement or visual treatments.",
        "deliverables": ["Exploratory scope only; not currently a standalone bookable service."],
        "note": "Availability will be updated as this capability develops.",
    },
    {
        "slug": "digital-projects",
        "name": "Digital creative projects",
        "category": "Digital",
        "status": "developing",
        "status_label": "In development",
        "tool": "HTML · CSS · JavaScript · Python · Flask",
        "summary": "Front-end work and Flask-based web development are developing capabilities.",
        "audience": "Digital concepts that need a thoughtful visual and technical foundation.",
        "deliverables": ["Exploratory scope only; not currently a standalone bookable service."],
        "note": "Availability will be updated as this capability develops.",
    },
]


def available_services() -> list[dict]:
    return [service for service in SERVICES if service["status"] == "available"]


def service_by_slug(slug: str) -> dict | None:
    return next((service for service in SERVICES if service["slug"] == slug), None)
