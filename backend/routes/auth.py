"""Auth routes: signup, login, email verification, forgotten passwords."""

from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import (
    limiter,
    email_key,
    user_key,
    LOGIN_IP_LIMIT,
    LOGIN_FAIL_LIMIT,
    SIGNUP_LIMIT,
    RESET_IP_LIMIT,
    RESET_EMAIL_LIMIT,
)
from models import User, db
from notifications import (
    send_password_changed_email,
    send_password_reset_email,
    send_verification_email,
)
from utils import hash_password, verify_password, normalize_phone, issue_token
from verification import read_reset_token, read_token, reset_token_matches

bp = Blueprint("auth", __name__, url_prefix="/auth")

# How long a student must wait before asking for another verification email.
RESEND_WAIT_SECONDS = 60


def _now():
    """The current time as the database stores it (UTC, no time zone attached)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


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
    user.verification_sent_at = _now()
    db.session.add(user)
    db.session.commit()

    # Ask them to confirm the address. They can already browse; posting needs this.
    send_verification_email(user)

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


@bp.route("/verify-email", methods=["POST"])
@limiter.limit("120 per hour")
def verify_email():
    """The page behind the link in the email sends the token here. It needs no login,
    because the link is often opened on a different device from the one used to sign up."""
    token = str((request.get_json(silent=True) or {}).get("token") or "")
    data, problem = read_token(token) if token else (None, "invalid")

    if problem == "expired":
        return jsonify(
            {"error": "This link has expired. Log in and ask for a new one.", "code": "expired"}
        ), 400
    if problem or not data:
        return jsonify({"error": "This link is not valid.", "code": "invalid"}), 400

    user = db.session.get(User, data.get("id"))
    # The link is only good for the address it was sent to.
    if user is None or user.email.lower() != str(data.get("email") or "").lower():
        return jsonify({"error": "This link is not valid.", "code": "invalid"}), 400

    if not user.email_verified:
        user.email_verified = True
        db.session.commit()
    return jsonify({"verified": True}), 200


@bp.route("/resend-verification", methods=["POST"])
@jwt_required()
@limiter.limit("10 per hour", key_func=user_key)
def resend_verification():
    user = db.session.get(User, int(get_jwt_identity()))
    if user.email_verified:
        return jsonify({"message": "Your email is already verified", "verified": True}), 200

    # One email a minute is plenty, and it stops the button being used to spam a mailbox.
    if user.verification_sent_at:
        waited = (_now() - user.verification_sent_at).total_seconds()
        if waited < RESEND_WAIT_SECONDS:
            wait = int(RESEND_WAIT_SECONDS - waited) + 1
            return jsonify({"error": f"Please wait {wait} seconds before asking for another email."}), 429

    user.verification_sent_at = _now()
    db.session.commit()
    send_verification_email(user)
    return jsonify({"message": f"We sent a new link to {user.email}"}), 200


@bp.route("/forgot-password", methods=["POST"])
@limiter.limit(RESET_IP_LIMIT)
@limiter.limit(RESET_EMAIL_LIMIT, key_func=email_key)
def forgot_password():
    """Email a reset link. It always answers the same way, so nobody can use this page
    to find out who has an account."""
    email = _clean_email((request.get_json(silent=True) or {}).get("email"))
    if email:
        user = User.query.filter(db.func.lower(User.email) == email).first()
        if user is not None:
            send_password_reset_email(user)
    return jsonify(
        {"message": "If there is an account for that email, we have sent a link to reset the password."}
    ), 200


@bp.route("/reset-password", methods=["POST"])
@limiter.limit(RESET_IP_LIMIT)
def reset_password():
    """The page behind the link in the reset email sends the token and the new password here."""
    data = request.get_json(silent=True) or {}
    token = str(data.get("token") or "")
    new_password = str(data.get("new_password") or "")

    payload, problem = read_reset_token(token) if token else (None, "invalid")
    if problem == "expired":
        return jsonify(
            {"error": "This link has expired. Ask for a new one.", "code": "expired"}
        ), 400
    if problem or not payload:
        return jsonify({"error": "This link is not valid.", "code": "invalid"}), 400

    user = db.session.get(User, payload.get("id"))
    # The link is used up as soon as the password changes.
    if user is None or not reset_token_matches(user, payload):
        return jsonify(
            {
                "error": "This link has already been used or is no longer valid. Ask for a new one.",
                "code": "invalid",
            }
        ), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    user.set_password(new_password)
    user.token_version += 1  # logs them out on every device
    user.email_verified = True  # they opened a link that was sent to this mailbox
    db.session.commit()

    send_password_changed_email(user)
    return jsonify({"message": "Your password has been changed. You can log in now."}), 200
