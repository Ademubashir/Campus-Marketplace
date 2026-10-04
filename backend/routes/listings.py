"""Listings routes: CRUD, search/filter, sold status."""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import db, Listing, ListingPhoto, Category, User

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
@bp.route("", methods=["POST"])
@jwt_required()
def create_listing():
    return jsonify({"error": "Not implemented yet"}), 501


@bp.route("/<int:listing_id>", methods=["PATCH"])
@jwt_required()
def update_listing(listing_id):
    return jsonify({"error": "Not implemented yet"}), 501


@bp.route("/<int:listing_id>", methods=["DELETE"])
@jwt_required()
def delete_listing(listing_id):
    return jsonify({"error": "Not implemented yet"}), 501


@bp.route("/<int:listing_id>/sold", methods=["PATCH"])
@jwt_required()
def mark_sold(listing_id):
    return jsonify({"error": "Not implemented yet"}), 501