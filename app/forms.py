"""Server-validated enquiry form."""

from flask_wtf import FlaskForm
from wtforms import SelectField, StringField, TextAreaField
from wtforms.validators import DataRequired, Email, Length, Optional


class ContactForm(FlaskForm):
    name = StringField(
        "Your name",
        validators=[DataRequired(message="Enter your name."), Length(min=2, max=100)],
    )
    email = StringField(
        "Email address",
        validators=[DataRequired(message="Enter your email address."), Email(), Length(max=254)],
    )
    service = SelectField(
        "Service you need",
        choices=[],
        validators=[DataRequired(message="Choose a service or select ‘Not sure yet’."), Length(max=64)],
    )
    description = TextAreaField(
        "Tell us about the project",
        validators=[
            DataRequired(message="Add a short project description."),
            Length(min=20, max=5000, message="Use between 20 and 5,000 characters."),
        ],
    )
    budget = StringField("Budget (optional)", validators=[Optional(), Length(max=80)])
    deadline = StringField("Ideal deadline (optional)", validators=[Optional(), Length(max=120)])
    website = StringField("Leave this field empty", validators=[Optional(), Length(max=200)])
