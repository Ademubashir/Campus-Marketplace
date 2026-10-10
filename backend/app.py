"""Flask application factory.

Usage:
    cd backend
    python -m flask --app app:create_app run --debug

Or simply:
    python app.py
"""
import os
from dotenv import load_dotenv

# Load backend/.env before importing config so env vars are populated.
load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from database import init_db
from routes import register_routes

# Lazy imports to avoid circular imports.
from models import User, Category, Listing, ListingPhoto  # noqa: F401


def create_app(config_class=Config):
    """Create and configure a Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
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

    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "service": "campus-marketplace"}), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)