"""Listings routes: CRUD, search/filter, sold status, photos."""

import os
import uuid
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Listing, ListingPhoto, Category, User

bp = Blueprint("listings", __name__, url_prefix="/listings")


@bp.route("", methods=["GET"])
def list_listings():
    """Browse listings with optional search, category filter, and sort."""
    q = request.args.get("q", "")
    category_id = request.args.get("category_id", type=int)
    sort = request.args.get("sort", "newest")
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 20, type=int)

    query = Listing.query.filter(Listing.status == "available")

    if q:
        q_pattern = f"%{q}%"
        query = query.filter(
            db.or_(
                Listing.title.ilike(q_pattern),
                Listing.description.ilike(q_pattern),
            )
        )

    if category_id:
        query = query.filter(Listing.category_id == category_id)

    # Sorting options
    if sort == "price_asc":
        query = query.order_by(Listing.price.asc(), Listing.created_at.desc())
    elif sort == "price_desc":
        query = query.order_by(Listing.price.desc(), Listing.created_at.desc())
    else:
        query = query.order_by(Listing.created_at.desc())

    pagination = query.paginate(page=page, per_page=limit, error_out=False)
    items = []
    for listing in pagination.items:
        # Include first photo URL
        first_photo = listing.photos[0] if listing.photos else None
        items.append(
            {
                "id": listing.id,
                "title": listing.title,
                "price": float(listing.price),
                "category": listing.category.name if listing.category else None,
                "condition": listing.condition,
                "first_photo_url": first_photo.url if first_photo else None,
                "created_at": listing.created_at,
            }
        )

    return jsonify(
        {
            "items": items,
            "page": pagination.page,
            "pages": pagination.pages,
            "total": pagination.total,
        }
    ), 200


@bp.route("/<int:listing_id>", methods=["GET"])
def get_listing(listing_id):
    """Get a single listing's details."""
    listing = Listing.query.get_or_404(listing_id)
    photos = [p.url for p in listing.photos]
    return jsonify(
        {
            "id": listing.id,
            "title": listing.title,
            "price": float(listing.price),
            "category": listing.category.name if listing.category else None,
            "description": listing.description,
            "condition": listing.condition,
            "status": listing.status,
            "photos": photos,
            "seller": {
                "id": listing.seller.id,
                "full_name": listing.seller.full_name,
                "phone": listing.seller.phone,
            },
            "created_at": listing.created_at,
        }
    ), 200


# Placeholder routes for signup (Step 2 will implement them)
VALID_CONDITIONS = ("new", "used")

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
)
MAX_PHOTOS = 5
MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB per photo


def _image_extension(data):
    """Return an extension only if the bytes really are a JPEG, PNG or WebP."""
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def _read_photos(files, already_have=0):
    """Validate uploads. Returns (list of (bytes, ext), error_message)."""
    files = [f for f in files if f and f.filename]
    if already_have + len(files) > MAX_PHOTOS:
        return None, f"A listing can have at most {MAX_PHOTOS} photos"
    photos = []
    for f in files:
        data = f.read(MAX_PHOTO_BYTES + 1)
        if len(data) > MAX_PHOTO_BYTES:
            return None, "Each photo must be 5 MB or smaller"
        ext = _image_extension(data)
        if ext is None:
            return None, "Photos must be JPEG, PNG or WebP images"
        photos.append((data, ext))
    return photos, None


def _save_photos(listing, photos):
    """Write files under random names and add their rows (caller commits)."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    start = len(listing.photos)
    for i, (data, ext) in enumerate(photos):
        name = f"{uuid.uuid4().hex}.{ext}"
        with open(os.path.join(UPLOAD_DIR, name), "wb") as out:
            out.write(data)
        db.session.add(
            ListingPhoto(
                listing_id=listing.id,
                url=f"/api/v1/listings/photos/{name}",
                sort_order=start + i,
            )
        )


def _delete_photo_file(photo):
    path = os.path.join(UPLOAD_DIR, os.path.basename(photo.url))
    if os.path.isfile(path):
        os.remove(path)


def _current_user_id():
    return int(get_jwt_identity())


def _request_data():
    """Read fields from a multipart form or from JSON."""
    if request.form:
        return request.form
    return request.get_json(silent=True) or {}


def _listing_to_dict(listing):
    return {
        "id": listing.id,
        "title": listing.title,
        "price": float(listing.price),
        "category": listing.category.name if listing.category else None,
        "description": listing.description,
        "condition": listing.condition,
        "status": listing.status,
        "photos": [p.url for p in listing.photos],
        "seller_id": listing.seller_id,
        "created_at": listing.created_at,
    }


def _clean_fields(data, require_all):
    """Validate listing fields. Returns (clean_dict, error_message).

    require_all=True is used when creating; for edits only the fields
    that were sent are checked and changed.
    """
    clean = {}

    if require_all or "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return None, "Title is required"
        if len(title) > 100:
            return None, "Title must be 100 characters or fewer"
        clean["title"] = title

    if require_all or "price" in data:
        try:
            price = Decimal(str(data.get("price")))
        except (InvalidOperation, ValueError):
            return None, "Price must be a number"
        if not price.is_finite() or price <= 0 or price >= 10**8:
            return None, "Price must be greater than 0"
        clean["price"] = price

    if require_all or "category_id" in data:
        try:
            category_id = int(data.get("category_id"))
        except (TypeError, ValueError):
            return None, "category_id must be a number"
        if db.session.get(Category, category_id) is None:
            return None, "Category does not exist"
        clean["category_id"] = category_id

    if "description" in data:
        description = (data.get("description") or "").strip()
        if len(description) > 2000:
            return None, "Description must be 2000 characters or fewer"
        clean["description"] = description

    if "condition" in data:
        condition = (data.get("condition") or "").strip().lower()
        if condition and condition not in VALID_CONDITIONS:
            return None, "Condition must be 'new' or 'used'"
        clean["condition"] = condition or None

    return clean, None


def _owned_listing_or_error(listing_id):
    """Return (listing, None) if the logged-in user owns it, else (None, response)."""
    listing = db.session.get(Listing, listing_id)
    if listing is None:
        return None, (jsonify({"error": "Listing not found"}), 404)
    if listing.seller_id != _current_user_id():
        return None, (jsonify({"error": "You can only change your own listings"}), 403)
    return listing, None

@bp.route("", methods=["POST"])
@jwt_required()
def create_listing():
    clean, error = _clean_fields(_request_data(), require_all=True)
    if error:
        return jsonify({"error": error}), 400

    photos, error = _read_photos(request.files.getlist("photos"))
    if error:
        return jsonify({"error": error}), 400

    listing = Listing(seller_id=_current_user_id(), **clean)
    db.session.add(listing)
    db.session.flush()  # gives the listing an id before saving photos
    _save_photos(listing, photos)
    db.session.commit()
    return jsonify(_listing_to_dict(listing)), 201


@bp.route("/<int:listing_id>", methods=["PATCH"])
@jwt_required()
def update_listing(listing_id):
    listing, err = _owned_listing_or_error(listing_id)
    if err:
        return err

    clean, error = _clean_fields(_request_data(), require_all=False)
    if error:
        return jsonify({"error": error}), 400

    for field, value in clean.items():
        setattr(listing, field, value)
    db.session.commit()
    return jsonify(_listing_to_dict(listing)), 200


@bp.route("/<int:listing_id>", methods=["DELETE"])
@jwt_required()
def delete_listing(listing_id):
    listing, err = _owned_listing_or_error(listing_id)
    if err:
        return err

    for photo in list(listing.photos):
        _delete_photo_file(photo)
    ListingPhoto.query.filter_by(listing_id=listing.id).delete()
    db.session.delete(listing)
    db.session.commit()
    return jsonify({"message": "Listing deleted"}), 200


@bp.route("/<int:listing_id>/sold", methods=["PATCH"])
@jwt_required()
def mark_sold(listing_id):
    listing, err = _owned_listing_or_error(listing_id)
    if err:
        return err

    sold = (request.get_json(silent=True) or {}).get("sold", True)
    if not isinstance(sold, bool):
        return jsonify({"error": "'sold' must be true or false"}), 400

    listing.status = "sold" if sold else "available"
    db.session.commit()
    return jsonify(_listing_to_dict(listing)), 200

@bp.route("/<int:listing_id>/photos", methods=["POST"])
@jwt_required()
def add_photos(listing_id):
    listing, err = _owned_listing_or_error(listing_id)
    if err:
        return err

    photos, error = _read_photos(
        request.files.getlist("photos"), already_have=len(listing.photos)
    )
    if error:
        return jsonify({"error": error}), 400
    if not photos:
        return jsonify({"error": "No photos uploaded"}), 400

    _save_photos(listing, photos)
    db.session.commit()
    return jsonify(_listing_to_dict(listing)), 201


@bp.route("/<int:listing_id>/photos/<int:photo_id>", methods=["DELETE"])
@jwt_required()
def delete_photo(listing_id, photo_id):
    listing, err = _owned_listing_or_error(listing_id)
    if err:
        return err

    photo = ListingPhoto.query.filter_by(id=photo_id, listing_id=listing.id).first()
    if photo is None:
        return jsonify({"error": "Photo not found"}), 404

    _delete_photo_file(photo)
    db.session.delete(photo)
    db.session.commit()
    return jsonify({"message": "Photo deleted"}), 200


@bp.route("/photos/<filename>", methods=["GET"])
def serve_photo(filename):
    return send_from_directory(UPLOAD_DIR, filename)