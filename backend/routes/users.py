"""User profile routes."""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User

bp = Blueprint("users", __name__, url_prefix="/users")


@bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "university": user.university,
            "created_at": user.created_at,
        }
    ), 200

@bp.route("/me/listings", methods=["GET"])
@jwt_required()
def my_listings():
    """All of the logged-in user's listings, including sold ones."""
    from models import Listing  # imported here so we don't touch the top of the file

    user_id = int(get_jwt_identity())
    listings = (
        Listing.query.filter_by(seller_id=user_id)
        .order_by(Listing.created_at.desc())
        .all()
    )

    items = []
    for listing in listings:
        first_photo = listing.photos[0] if listing.photos else None
        items.append(
            {
                "id": listing.id,
                "title": listing.title,
                "price": float(listing.price),
                "category": listing.category.name if listing.category else None,
                "condition": listing.condition,
                "status": listing.status,
                "first_photo_url": first_photo.url if first_photo else None,
                "created_at": listing.created_at,
            }
        )

    return jsonify({"items": items}), 200


@bp.route("/me/logout-others", methods=["POST"])
@jwt_required()
def logout_other_devices():
    """Cut off every other device. The one asking gets a fresh token and stays in."""
    from utils import issue_token

    user = db.session.get(User, int(get_jwt_identity()))
    user.token_version += 1  # every older token now fails the version check
    db.session.commit()
    return jsonify(
        {"message": "Logged out of all other devices", "token": issue_token(user)}
    ), 200


@bp.route("/me/password", methods=["POST"])
@jwt_required()
def change_password():
    """Change the password. This also logs out every other device."""
    from utils import issue_token

    data = request.get_json(silent=True) or {}
    current = data.get("current_password") or ""
    new = data.get("new_password") or ""

    user = db.session.get(User, int(get_jwt_identity()))

    # 400, not 401: a 401 would make the app think the login expired.
    if not user.check_password(current):
        return jsonify({"error": "Current password is wrong"}), 400
    if len(new) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400
    if new == current:
        return jsonify({"error": "Choose a password different from the current one"}), 400

    user.set_password(new)
    user.token_version += 1
    db.session.commit()
    return jsonify({"message": "Password changed", "token": issue_token(user)}), 200
