"""Flask application factory.

Development (your laptop):
    cd backend
    python app.py

Production (the hosting service):
    gunicorn wsgi:app        (with FLASK_ENV=production and the secrets set)
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env before importing config so env vars are populated.
# (On a hosting service there is no .env file; the host sets the variables.)
load_dotenv()

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import NotFound

from config import Config, check_production_settings, is_production
from database import init_db
from routes import register_routes

# Lazy imports to avoid circular imports.
from models import User, Category, Listing, ListingPhoto  # noqa: F401

# The built React site (made by `npm run build` in the frontend folder).
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


def create_app(config_class=Config):
    """Create and configure a Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # In production, stop right away if the secrets are missing or placeholders.
    if is_production():
        check_production_settings(app.config)

    # CORS: in development the Vite server talks to Flask from another port, so
    # allow it. In production the site and the API share one address, so CORS is
    # off unless CORS_ORIGINS lists specific addresses (comma-separated).
    if not is_production():
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    else:
        origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
        if origins:
            CORS(app, resources={r"/api/*": {"origins": origins}})

    jwt = JWTManager(app)
    db, migrate = init_db(app)

    @jwt.expired_token_loader
    def _expired_token(jwt_header, jwt_data):
        return jsonify({"error": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def _invalid_token(reason):
        return jsonify({"error": "Invalid token"}), 401

    @jwt.unauthorized_loader
    def _unauthorized_token(reason):
        return jsonify({"error": "Missing token"}), 401

    # A token is revoked when its version no longer matches the user's current
    # token_version (they logged out of all devices or changed their password).
    @jwt.token_in_blocklist_loader
    def _token_is_revoked(jwt_header, jwt_data):
        user = db.session.get(User, int(jwt_data["sub"]))
        return user is None or jwt_data.get("tv", 0) != user.token_version

    @jwt.revoked_token_loader
    def _revoked_token(jwt_header, jwt_data):
        return jsonify({"error": "Session ended. Please log in again."}), 401

    # Register blueprints / routes
    register_routes(app)

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": "Upload too large: up to 5 photos, 5 MB each"}), 413

    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "service": "campus-marketplace"}), 200

    # Serve the built React site from the same address as the API.
    # Real files (JS, CSS, images) are sent as they are. Any other address, such as
    # /listings/5 or /browse, gets index.html so React can draw the right page
    # (this is what makes a refresh on those pages work).
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        # An unknown API address must stay a JSON error, not turn into a web page.
        if path == "api" or path.startswith("api/"):
            return jsonify({"error": "Not found"}), 404
        if not (FRONTEND_DIST / "index.html").is_file():
            return jsonify({"error": "Frontend not built. Run npm run build in frontend/."}), 404
        if path:
            try:
                return send_from_directory(FRONTEND_DIST, path)
            except NotFound:
                pass
        return send_from_directory(FRONTEND_DIST, "index.html")

    return app


if __name__ == "__main__":
    # Only for running on your own computer. On a hosting service, gunicorn runs
    # the app through wsgi.py instead.
    app = create_app()
    debug = not is_production()
    port = int(os.environ.get("PORT", 5000))
    host = "127.0.0.1" if debug else "0.0.0.0"
    app.run(host=host, port=port, debug=debug)
