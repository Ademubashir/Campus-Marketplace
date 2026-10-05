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

    # Register blueprints / routes
    register_routes(app)

    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "service": "campus-marketplace"}), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)