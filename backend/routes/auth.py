"""Auth routes: signup, login."""

from flask import Blueprint, request, jsonify

from models import User, db
from utils import hash_password, verify_password, normalize_phone, issue_token

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")
    phone = data.get("phone")
    university = data.get("university")

    if not email or not password or not full_name or not phone or not university:
        return jsonify({"error": "All fields required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter_by(email=email).first():
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


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = issue_token(user)
    return jsonify({"user": {"id": user.id, "email": user.email}, "token": access_token}), 200