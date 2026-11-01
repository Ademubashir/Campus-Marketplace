"""Listings routes: CRUD, search/filter, sold status, photos."""

import os
import uuid
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify, current_app, send_from_directory, abort
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Listing, ListingPhoto, Category, User

bp = Blueprint("listings", __name__, url_prefix="/listings")


def _publicly_visible(query):
    """What the public may see: approved listings from students who are not suspended.
    Every public listing page goes through this one rule."""
    return query.filter(
        Listing.review_status == "approved",
        Listing.seller.has(User.is_suspended.is_(False)),
    )


@bp.route("", methods=["GET"])
@jwt_required()
def list_listings():
    """Browse listings with optional search, category filter, and sort."""
    q = request.args.get("q", "")
    category_id = request.args.get("category_id", type=int)
    sort = request.args.get("sort", "newest")
    page = request.args.get("page", 1, type=int) or 1
    limit = request.args.get("limit", 20, type=int) or 20
    page = max(page, 1)
    limit = min(max(limit, 1), 50)

    # Sold items stay in the list (the card shows a "Sold" badge). The Home page
    # passes status=available to show only items that can still be bought.
    query = Listing.query
    status = request.args.get("status")
    if status in ("available", "sold"):
        query = query.filter(Listing.status == status)
    # Only approved listings from students who are not suspended are shown.
    query = _publicly_visible(query)

    if q:
        # Escape backslash first, then % and _, so they match literally.
        q_pattern = f"%{q.replace(chr(92), chr(92) + chr(92)).replace('%', chr(92) + '%').replace('_', chr(92) + '_')}%"
        query = query.filter(
            db.or_(
                Listing.title.ilike(q_pattern, escape=chr(92)),
                Listing.description.ilike(q_pattern, escape=chr(92)),
            )
        )

    if category_id:
        query = query.filter(Listing.category_id == category_id)

    # Sorting options
    # Available items first, sold ones after them, then the chosen sort order.
    sold_last = db.case((Listing.status == "sold", 1), else_=0)
    if sort == "price_asc":
        query = query.order_by(sold_last, Listing.price.asc(), Listing.created_at.desc())
    elif sort == "price_desc":
        query = query.order_by(sold_last, Listing.price.desc(), Listing.created_at.desc())
    else:
        query = query.order_by(sold_last, Listing.created_at.desc())

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
                "status": listing.status,
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
@jwt_required()
def get_listing(listing_id):
    """Get a single listing's details."""
    listing = Listing.query.get_or_404(listing_id)
    # A listing that is not public yet (or belongs to a suspended student) can only be
    # opened by its owner. Everyone else gets "not found", as if it did not exist.
    is_owner = listing.seller_id == _current_user_id()
    is_public = listing.review_status == "approved" and not listing.seller.is_suspended
    if not (is_public or is_owner):
        abort(404)
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
            "review_status": listing.review_status,
            # The reason is for the seller only.
            "rejection_reason": listing.rejection_reason if is_owner else None,
            "photos": photos,
            # The same photos with their ids, so the owner can remove one of them.
            "photo_items": [{"id": p.id, "url": p.url} for p in listing.photos],
            "seller": {
                "id": listing.seller.id,
                "full_name": listing.seller.full_name,
                "phone": listing.seller.phone,
                "university": listing.seller.university,
            },
            "created_at": listing.created_at,
        }
    ), 200


# Helpers and routes for creating, editing and deleting listings and their photos
VALID_CONDITIONS = ("new", "used")

def _upload_dir():
    """Where photos are stored (the UPLOAD_FOLDER setting)."""
    return str(current_app.config["UPLOAD_FOLDER"])


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
    upload_dir = _upload_dir()
    os.makedirs(upload_dir, exist_ok=True)
    start = len(listing.photos)
    for i, (data, ext) in enumerate(photos):
        name = f"{uuid.uuid4().hex}.{ext}"
        with open(os.path.join(upload_dir, name), "wb") as out:
            out.write(data)
        db.session.add(
            ListingPhoto(
                listing_id=listing.id,
                url=f"/api/v1/listings/photos/{name}",
                sort_order=start + i,
            )
        )


def _delete_photo_file(photo):
    path = os.path.join(_upload_dir(), os.path.basename(photo.url))
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
        "review_status": listing.review_status,
        "rejection_reason": listing.rejection_reason,
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
        category = db.session.get(Category, category_id)
        if category is None:
            return None, "Category does not exist"
        # Hidden categories can't be chosen for new listings (existing ones may still be edited).
        if require_all and category.is_hidden:
            return None, "That category is no longer available"
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


# Changing these on an approved listing sends it back for another review.
REVIEWED_FIELDS = ("title", "description", "category_id")


def _same(a, b):
    """Equal, treating a missing description and an empty one as the same."""
    return (a if a is not None else "") == (b if b is not None else "")


def _send_to_review(listing):
    """Put a listing back in the review queue. It stays hidden until approved."""
    if listing.review_status != "pending":
        listing.submitted_at = db.func.now()  # joins the back of the queue
    listing.review_status = "pending"
    listing.rejection_reason = None
    listing.reviewed_by = None
    listing.reviewed_at = None


def _needs_review_again(listing, changed_fields, photos_added=False):
    """A rejected listing goes back to review after any change. An approved one only
    when something a moderator checks changed: title, description, category or a new
    photo. Changing the price, the condition or sold/available does not."""
    if listing.review_status == "rejected":
        return bool(changed_fields) or photos_added
    if listing.review_status == "approved":
        return photos_added or any(f in REVIEWED_FIELDS for f in changed_fields)
    return False


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
    # Posting needs a confirmed email address: it is where we send the review result,
    # and it stops accounts made with made-up addresses from filling the site.
    seller = db.session.get(User, _current_user_id())
    if not seller.email_verified:
        return (
            jsonify(
                {
                    "error": "Confirm your email address to post listings. We sent you a link.",
                    "code": "email_not_verified",
                }
            ),
            403,
        )

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

    # Work out what really changed, to decide whether a moderator must look again.
    changed = [f for f in clean if not _same(getattr(listing, f), clean[f])]
    for field, value in clean.items():
        setattr(listing, field, value)
    if _needs_review_again(listing, changed):
        _send_to_review(listing)
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
    if _needs_review_again(listing, [], photos_added=True):
        _send_to_review(listing)
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
    # Removing a photo only matters to a rejected listing (any change resubmits it).
    if _needs_review_again(listing, ["photo"]):
        _send_to_review(listing)
    db.session.commit()
    return jsonify({"message": "Photo deleted", "review_status": listing.review_status}), 200


@bp.route("/photos/<filename>", methods=["GET"])
def serve_photo(filename):
    return send_from_directory(_upload_dir(), filename)