"""Configuration for the Flask app. Reads from environment variables.

Usage:
    - Copy backend/.env.example to backend/.env and fill in your values.
    - The .env file is loaded automatically when Flask starts (see app.py).
"""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def _get(name, default=None):
    """Return an env var, falling back to a default."""
    return os.environ.get(name, default)


class Config:
    """Base / development configuration."""

    # --- Database ---
    # Default to a local PostgreSQL connection; override with DATABASE_URL.
    SQLALCHEMY_DATABASE_URI = _get(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/campus_marketplace",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- App ---
    SECRET_KEY = _get("SECRET_KEY", "dev-secret-key")
    FLASK_ENV = _get("FLASK_ENV", "development")

    # --- JWT ---
    JWT_SECRET_KEY = _get("JWT_SECRET_KEY", "dev-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=3)  # stay logged in for three days

    # --- Uploads ---
    UPLOAD_FOLDER = BASE_DIR / "uploads"
    UPLOAD_FOLDER.mkdir(exist_ok=True)
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB max request size
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
