"""Auth routes: signup, login."""

from flask import Blueprint, request, jsonify, current_app

from extensions import (
    limiter,
    email_key,
    LOGIN_IP_LIMIT,
    LOGIN_FAIL_LIMIT,
    SIGNUP_LIMIT,
)
from models import User, db
from utils import hash_password, verify_password, normalize_phone, issue_token

bp = Blueprint("auth", __name__, url_prefix="/auth")


def _clean_email(value):
    """Emails are not case-sensitive, and phone keyboards often capitalise the first
    letter, so always compare them in lower case."""
    return str(value or "").strip().lower()


@bp.route("/signup", methods=["POST"])
@limiter.limit(SIGNUP_LIMIT)
def signup():
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email"))
    password = data.get("password") or ""
    full_name = str(data.get("full_name") or "").strip()
    phone = data.get("phone")
    university = str(data.get("university") or "").strip()

    if not email or not password or not full_name or not phone or not university:
        return jsonify({"error": "All fields required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Accept the number the way people type it (0801 234 5678) and store it
    # in international form (+2348012345678), which is what WhatsApp links need.
    try:
        phone = normalize_phone(phone)
    except ValueError as err:
        return jsonify({"error": str(err)}), 400

    user = User(
        email=email,
        full_name=full_name,
        phone=phone,
        university=university,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    access_token = issue_token(user)
    return jsonify({"user": {"id": user.id, "email": user.email}, "token": access_token}), 201


# Two limits: a generous one per visitor address (many students share one campus
# Wi-Fi address), and a strict one on WRONG passwords for each email address, so
# nobody can keep guessing one student's password.
@bp.route("/login", methods=["POST"])
@limiter.limit(LOGIN_IP_LIMIT)
@limiter.limit(LOGIN_FAIL_LIMIT, key_func=email_key, deduct_when=lambda r: r.status_code == 401)
def login():
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email"))
    password = data.get("password") or ""

    user = User.query.filter(db.func.lower(User.email) == email).first() if email else None
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    # Checked only after the password is right, so nobody learns an account's
    # status without knowing the password.
    if user.is_suspended:
        reason = user.suspension_reason or "no reason was given"
        support = current_app.config["SUPPORT_EMAIL"]
        return jsonify({"error": f"Your account is suspended: {reason}. Contact {support}."}), 403

    access_token = issue_token(user)
    return jsonify({"user": {"id": user.id, "email": user.email}, "token": access_token}), 200
