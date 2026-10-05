"""Auth routes: signup, login."""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from models import User, db
from utils import hash_password, verify_password

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

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        email=email,
        full_name=full_name,
        phone=phone,
        university=university,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"user": {"id": user.id, "email": user.email}, "token": access_token}), 201


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"user": {"id": user.id, "email": user.email}, "token": access_token}), 200