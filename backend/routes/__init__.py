"""Route registration for the UniMart API.

Each route module defines its own Blueprint as ``bp``. Blueprints are
registered here under a shared ``/api/v1`` prefix.
"""
from flask import Blueprint


def register_routes(app):
    """Register all API blueprints with the Flask app."""
    # Import blueprints lazily to avoid circular imports at module load time.
    from routes.auth import bp as auth_bp
    from routes.categories import bp as categories_bp
    from routes.listings import bp as listings_bp
    from routes.users import bp as users_bp
    from routes.admin import bp as admin_bp

    api = Blueprint("api", __name__, url_prefix="/api/v1")

    api.register_blueprint(auth_bp)
    api.register_blueprint(categories_bp)
    api.register_blueprint(listings_bp)
    api.register_blueprint(users_bp)
    api.register_blueprint(admin_bp)

    app.register_blueprint(api)