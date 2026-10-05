"""Categories route."""

from flask import Blueprint, jsonify

from models import Category

bp = Blueprint("categories", __name__, url_prefix="/categories")


@bp.route("", methods=["GET"])
def list_categories():
    cats = Category.query.order_by(Category.name).all()
    return jsonify([{"id": c.id, "name": c.name, "slug": c.slug} for c in cats]), 200