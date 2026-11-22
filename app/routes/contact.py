"""Enquiry form routes."""

from flask import Blueprint, current_app, flash, redirect, render_template, request, url_for

from app import limiter
from app.content.services import available_services
from app.forms import ContactForm
from app.services.mailer import mail_is_configured, send_enquiry

contact_bp = Blueprint("contact", __name__)


def _new_contact_form() -> ContactForm:
    form = ContactForm()
    form.service.choices = [("", "Choose a service")]
    form.service.choices.extend(
        (service["slug"], service["name"]) for service in available_services()
    )
    form.service.choices.append(("unsure", "Not sure yet"))
    return form


@contact_bp.route("/contact", methods=["GET", "POST"])
@limiter.limit("5 per hour", methods=["POST"])
def contact():
    form = _new_contact_form()
    if request.method == "POST" and form.validate_on_submit():
        if form.website.data:
            return render_template(
                "pages/contact.html",
                title="Contact DELTAX5",
                description="Start a project enquiry with DELTAX5.",
                form=form,
                delivery_error="The form could not be processed. Please try again or use the direct contact links.",
            ), 400

        if not mail_is_configured():
            return render_template(
                "pages/contact.html",
                title="Contact DELTAX5",
                description="Start a project enquiry with DELTAX5.",
                form=form,
                delivery_error="Email delivery is not configured yet. Your message was not sent; please use the direct contact links.",
            ), 503

        selected = dict(form.service.choices).get(form.service.data, "Not sure yet")
        enquiry = {
            "name": form.name.data.strip(),
            "email": form.email.data.strip(),
            "service_name": selected,
            "description": form.description.data.strip(),
            "budget": (form.budget.data or "").strip(),
            "deadline": (form.deadline.data or "").strip(),
        }
        try:
            send_enquiry(enquiry)
        except Exception:
            current_app.logger.exception("Could not deliver a DELTAX5 enquiry.")
            return render_template(
                "pages/contact.html",
                title="Contact DELTAX5",
                description="Start a project enquiry with DELTAX5.",
                form=form,
                delivery_error="Your enquiry was not sent. Please try again later or use the direct contact links.",
            ), 503

        flash("Your enquiry has been sent to DELTAX5.", "success")
        return redirect(url_for("contact.contact"))

    return render_template(
        "pages/contact.html",
        title="Contact DELTAX5",
        description="Start a project enquiry with DELTAX5.",
        form=form,
    )
