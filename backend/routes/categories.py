"""Categories route."""

from flask import Blueprint, jsonify
from sqlalchemy import case

from models import Category

bp = Blueprint("categories", __name__, url_prefix="/categories")


@bp.route("", methods=["GET"])
def list_categories():
    # Alphabetical, but "Other" always comes last.
    other_last = case((Category.slug == "other", 1), else_=0)
    cats = Category.query.order_by(other_last, Category.name).all()
    return jsonify([{"id": c.id, "name": c.name, "slug": c.slug} for c in cats]), 200