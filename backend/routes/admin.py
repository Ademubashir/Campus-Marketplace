"""Admin area routes (everything under /api/v1/admin).

Admins are separate accounts from students. An admin's login token carries
role="admin" and works only on these routes; a student's token never works here
(app.py keeps the two sides apart).
"""
import re
from datetime import timedelta
from functools import wraps

from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_limiter.util import get_remote_address
from sqlalchemy import case

from extensions import (
    LOGIN_FAIL_LIMIT,
    LOGIN_IP_LIMIT,
    PASSWORD_LIMIT,
    email_key,
    limiter,
)
from models import Admin, AdminAction, Category, Listing, ListingPhoto, User, db
from routes.listings import _delete_photo_file
from utils import issue_admin_token

bp = Blueprint("admin", __name__, url_prefix="/admin")

MAX_PAGE_SIZE = 50


# ---------- helpers ----------
def _data():
    return request.get_json(silent=True) or {}


def _like(text):
    """Escape % and _ so a search matches them literally."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _paging():
    page = max(request.args.get("page", 1, type=int) or 1, 1)
    limit = min(max(request.args.get("limit", 20, type=int) or 20, 1), MAX_PAGE_SIZE)
    return page, limit


def _page_of(query, page, limit):
    total = query.order_by(None).count()
    rows = query.limit(limit).offset((page - 1) * limit).all()
    pages = max((total + limit - 1) // limit, 1)
    return rows, {"page": page, "pages": pages, "total": total}


def _admin_key():
    """Count tries per signed-in admin (falls back to the visitor address)."""
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
    except Exception:
        identity = None
    return f"admin:{identity}" if identity else get_remote_address()


def admin_required(allow_pending=False):
    """Only a signed-in, active admin may use the route. A new admin who has not
    chosen their own password yet may only change it (allow_pending=True)."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            admin = db.session.get(Admin, int(get_jwt_identity()))
            if admin is None or not admin.is_active:
                return jsonify({"error": "Not authorised"}), 401
            if admin.must_change_password and not allow_pending:
                return (
                    jsonify(
                        {
                            "error": "Choose a new password first",
                            "code": "password_change_required",
                        }
                    ),
                    403,
                )
            g.admin = admin
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def _log(action, target_type, target_id=None, label=None, reason=None):
    """Write one line to the log (saved together with the action itself)."""
    db.session.add(
        AdminAction(
            admin_id=g.admin.id,
            admin_name=g.admin.name,
            action=action,
            target_type=target_type,
            target_id=target_id,
            target_label=(label or "")[:255] or None,
            reason=reason,
        )
    )


def _admin_dict(a):
    return {
        "id": a.id,
        "name": a.name,
        "email": a.email,
        "is_active": a.is_active,
        "must_change_password": a.must_change_password,
        "created_at": a.created_at,
        "last_login_at": a.last_login_at,
    }


def _user_dict(u, listing_count):
    return {
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "phone": u.phone,
        "university": u.university,
        "created_at": u.created_at,
        "is_suspended": u.is_suspended,
        "suspension_reason": u.suspension_reason,
        "suspended_at": u.suspended_at,
        "listing_count": listing_count,
    }


# ---------- sign-in, sign-out, password ----------
@bp.route("/auth/login", methods=["POST"])
@limiter.limit(LOGIN_IP_LIMIT)
@limiter.limit(
    LOGIN_FAIL_LIMIT, key_func=email_key, deduct_when=lambda r: r.status_code == 401
)
def admin_login():
    data = _data()
    email = str(data.get("email") or "").strip().lower()
    password = str(data.get("password") or "")
    admin = (
        Admin.query.filter(db.func.lower(Admin.email) == email).first() if email else None
    )
    if not admin or not admin.is_active or not admin.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
    admin.last_login_at = db.func.now()
    db.session.commit()
    return jsonify({"admin": _admin_dict(admin), "token": issue_admin_token(admin)}), 200


@bp.route("/auth/me", methods=["GET"])
@admin_required(allow_pending=True)
def admin_me():
    return jsonify({"admin": _admin_dict(g.admin)}), 200


@bp.route("/auth/logout", methods=["POST"])
@admin_required(allow_pending=True)
def admin_logout():
    # Raising the version ends every login this admin has, on the server too.
    g.admin.token_version += 1
    db.session.commit()
    return jsonify({"message": "Logged out"}), 200


@bp.route("/auth/password", methods=["POST"])
@admin_required(allow_pending=True)
@limiter.limit(
    PASSWORD_LIMIT, key_func=_admin_key, deduct_when=lambda r: r.status_code == 400
)
def admin_change_password():
    data = _data()
    current = str(data.get("current_password") or "")
    new = str(data.get("new_password") or "")

    # 400, not 401: a 401 would look like an expired login.
    if not g.admin.check_password(current):
        return jsonify({"error": "Current password is wrong"}), 400
    if len(new) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400
    if new == current:
        return jsonify({"error": "Choose a password different from the current one"}), 400

    g.admin.set_password(new)
    g.admin.must_change_password = False
    g.admin.token_version += 1  # every older login stops working
    db.session.commit()
    return (
        jsonify(
            {
                "message": "Password changed",
                "token": issue_admin_token(g.admin),
                "admin": _admin_dict(g.admin),
            }
        ),
        200,
    )


# ---------- overview ----------
@bp.route("/stats", methods=["GET"])
@admin_required()
def admin_stats():
    week = db.func.now() - timedelta(days=7)
    per_category = (
        db.session.query(Category.name, db.func.count(Listing.id))
        .outerjoin(Listing, Listing.category_id == Category.id)
        .group_by(Category.id, Category.name)
        .order_by(Category.name)
        .all()
    )
    return (
        jsonify(
            {
                "users": {
                    "total": User.query.count(),
                    "active": User.query.filter_by(is_suspended=False).count(),
                    "suspended": User.query.filter_by(is_suspended=True).count(),
                    "new_this_week": User.query.filter(User.created_at >= week).count(),
                },
                "listings": {
                    "total": Listing.query.count(),
                    "available": Listing.query.filter_by(status="available").count(),
                    "sold": Listing.query.filter_by(status="sold").count(),
                    "new_this_week": Listing.query.filter(
                        Listing.created_at >= week
                    ).count(),
                },
                "per_category": [{"category": n, "count": c} for n, c in per_category],
            }
        ),
        200,
    )


# ---------- students: list, suspend, reinstate ----------
@bp.route("/users", methods=["GET"])
@admin_required()
def admin_users():
    q = request.args.get("q", "").strip()
    status = request.args.get("status", "all")
    page, limit = _paging()

    listing_count = (
        db.select(db.func.count(Listing.id))
        .where(Listing.seller_id == User.id)
        .scalar_subquery()
    )
    query = User.query.add_columns(listing_count.label("listing_count"))
    if q:
        pattern = f"%{_like(q)}%"
        query = query.filter(
            db.or_(
                User.full_name.ilike(pattern, escape="\\"),
                User.email.ilike(pattern, escape="\\"),
                User.university.ilike(pattern, escape="\\"),
            )
        )
    if status == "active":
        query = query.filter(User.is_suspended.is_(False))
    elif status == "suspended":
        query = query.filter(User.is_suspended.is_(True))
    query = query.order_by(User.created_at.desc(), User.id.desc())

    rows, meta = _page_of(query, page, limit)
    return jsonify({"items": [_user_dict(u, n) for u, n in rows], **meta}), 200


@bp.route("/users/<int:user_id>/suspend", methods=["PATCH"])
@admin_required()
def admin_suspend_user(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404
    reason = str(_data().get("reason") or "").strip()
    if not reason:
        return jsonify({"error": "A reason is required"}), 400
    if len(reason) > 500:
        return jsonify({"error": "The reason must be 500 characters or fewer"}), 400
    if user.is_suspended:
        return jsonify({"error": "This user is already suspended"}), 400

    user.is_suspended = True
    user.suspension_reason = reason
    user.suspended_at = db.func.now()
    user.token_version += 1  # logs the student out on every device
    _log("suspend_user", "user", user.id, user.full_name, reason)
    db.session.commit()
    count = Listing.query.filter_by(seller_id=user.id).count()
    return jsonify({"user": _user_dict(user, count)}), 200


@bp.route("/users/<int:user_id>/reinstate", methods=["PATCH"])
@admin_required()
def admin_reinstate_user(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404
    if not user.is_suspended:
        return jsonify({"error": "This user is not suspended"}), 400

    user.is_suspended = False
    user.suspension_reason = None
    user.suspended_at = None
    _log("reinstate_user", "user", user.id, user.full_name)
    db.session.commit()
    count = Listing.query.filter_by(seller_id=user.id).count()
    return jsonify({"user": _user_dict(user, count)}), 200


# ---------- admin accounts ----------
@bp.route("/admins", methods=["GET"])
@admin_required()
def admin_list_admins():
    admins = Admin.query.order_by(Admin.created_at, Admin.id).all()
    return jsonify({"items": [_admin_dict(a) for a in admins]}), 200


@bp.route("/admins", methods=["POST"])
@admin_required()
def admin_create_admin():
    data = _data()
    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    password = str(data.get("password") or "")

    if not name or "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "A name and a valid email are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if Admin.query.filter(db.func.lower(Admin.email) == email).first():
        return jsonify({"error": "An admin with that email already exists"}), 409

    admin = Admin(name=name, email=email, must_change_password=True)
    admin.set_password(password)
    db.session.add(admin)
    db.session.flush()
    _log("create_admin", "admin", admin.id, f"{admin.name} <{admin.email}>")
    db.session.commit()
    return jsonify({"admin": _admin_dict(admin)}), 201


@bp.route("/admins/<int:admin_id>", methods=["PATCH"])
@admin_required()
def admin_update_admin(admin_id):
    target = db.session.get(Admin, admin_id)
    if target is None:
        return jsonify({"error": "Admin not found"}), 404
    if target.id == g.admin.id:
        return jsonify({"error": "You can't change your own account here"}), 400
    active = _data().get("is_active")
    if not isinstance(active, bool):
        return jsonify({"error": "'is_active' must be true or false"}), 400

    target.is_active = active
    if not active:
        target.token_version += 1  # ends their logins straight away
    _log(
        "activate_admin" if active else "deactivate_admin",
        "admin",
        target.id,
        f"{target.name} <{target.email}>",
    )
    db.session.commit()
    return jsonify({"admin": _admin_dict(target)}), 200


# ---------- listings ----------
@bp.route("/listings", methods=["GET"])
@admin_required()
def admin_listings():
    q = request.args.get("q", "").strip()
    status = request.args.get("status", "all")
    category_id = request.args.get("category_id", type=int)
    seller_id = request.args.get("seller_id", type=int)
    page, limit = _paging()

    query = Listing.query
    if q:
        query = query.filter(Listing.title.ilike(f"%{_like(q)}%", escape="\\"))
    if status in ("available", "sold"):
        query = query.filter(Listing.status == status)
    if category_id:
        query = query.filter(Listing.category_id == category_id)
    if seller_id:
        query = query.filter(Listing.seller_id == seller_id)
    query = query.order_by(Listing.created_at.desc(), Listing.id.desc())

    rows, meta = _page_of(query, page, limit)
    items = []
    for listing in rows:
        first = listing.photos[0] if listing.photos else None
        items.append(
            {
                "id": listing.id,
                "title": listing.title,
                "price": float(listing.price),
                "status": listing.status,
                "category": listing.category.name if listing.category else None,
                "seller": {
                    "id": listing.seller.id,
                    "full_name": listing.seller.full_name,
                    "is_suspended": listing.seller.is_suspended,
                },
                "first_photo_url": first.url if first else None,
                "photo_count": len(listing.photos),
                "created_at": listing.created_at,
            }
        )
    return jsonify({"items": items, **meta}), 200


@bp.route("/listings/<int:listing_id>", methods=["DELETE"])
@admin_required()
def admin_delete_listing(listing_id):
    listing = db.session.get(Listing, listing_id)
    if listing is None:
        return jsonify({"error": "Listing not found"}), 404
    reason = str(_data().get("reason") or "").strip() or None
    label = f"{listing.title} (seller: {listing.seller.full_name})"

    for photo in list(listing.photos):
        _delete_photo_file(photo)
    ListingPhoto.query.filter_by(listing_id=listing.id).delete()
    _log("delete_listing", "listing", listing.id, label, reason)
    db.session.delete(listing)
    db.session.commit()
    return jsonify({"message": "Listing deleted"}), 200


# ---------- categories ----------
def _slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _category_dict(c, count):
    return {
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "is_hidden": c.is_hidden,
        "listing_count": count,
    }


@bp.route("/categories", methods=["GET"])
@admin_required()
def admin_categories():
    other_last = case((Category.slug == "other", 1), else_=0)
    rows = (
        db.session.query(Category, db.func.count(Listing.id))
        .outerjoin(Listing, Listing.category_id == Category.id)
        .group_by(Category.id)
        .order_by(other_last, Category.name)
        .all()
    )
    return jsonify({"items": [_category_dict(c, n) for c, n in rows]}), 200


@bp.route("/categories", methods=["POST"])
@admin_required()
def admin_create_category():
    name = str(_data().get("name") or "").strip()
    if not 2 <= len(name) <= 50:
        return jsonify({"error": "The name must be 2 to 50 characters"}), 400
    slug = _slugify(name)
    if not slug:
        return jsonify({"error": "The name needs some letters or numbers"}), 400
    taken = Category.query.filter(
        db.or_(db.func.lower(Category.name) == name.lower(), Category.slug == slug)
    ).first()
    if taken:
        return jsonify({"error": "A category with that name already exists"}), 409

    category = Category(name=name, slug=slug)
    db.session.add(category)
    db.session.flush()
    _log("add_category", "category", category.id, category.name)
    db.session.commit()
    return jsonify({"category": _category_dict(category, 0)}), 201


@bp.route("/categories/<int:category_id>", methods=["PATCH"])
@admin_required()
def admin_update_category(category_id):
    category = db.session.get(Category, category_id)
    if category is None:
        return jsonify({"error": "Category not found"}), 404
    data = _data()

    if "name" in data:
        name = str(data.get("name") or "").strip()
        if not 2 <= len(name) <= 50:
            return jsonify({"error": "The name must be 2 to 50 characters"}), 400
        clash = Category.query.filter(
            db.func.lower(Category.name) == name.lower(), Category.id != category.id
        ).first()
        if clash:
            return jsonify({"error": "A category with that name already exists"}), 409
        if name != category.name:
            _log("rename_category", "category", category.id, f"{category.name} -> {name}")
            category.name = name  # the slug stays the same on purpose

    if "is_hidden" in data:
        hidden = data.get("is_hidden")
        if not isinstance(hidden, bool):
            return jsonify({"error": "'is_hidden' must be true or false"}), 400
        if hidden != category.is_hidden:
            _log(
                "hide_category" if hidden else "show_category",
                "category",
                category.id,
                category.name,
            )
            category.is_hidden = hidden

    db.session.commit()
    count = Listing.query.filter_by(category_id=category.id).count()
    return jsonify({"category": _category_dict(category, count)}), 200


# ---------- log ----------
@bp.route("/log", methods=["GET"])
@admin_required()
def admin_log():
    page, limit = _paging()
    query = AdminAction.query.order_by(AdminAction.created_at.desc(), AdminAction.id.desc())
    rows, meta = _page_of(query, page, limit)
    items = [
        {
            "id": a.id,
            "admin_name": a.admin_name,
            "action": a.action,
            "target_type": a.target_type,
            "target_id": a.target_id,
            "target_label": a.target_label,
            "reason": a.reason,
            "created_at": a.created_at,
        }
        for a in rows
    ]
    return jsonify({"items": items, **meta}), 200