"""Configuration for the Flask app. Reads from environment variables.

Usage:
    - Copy backend/.env.example to backend/.env and fill in your values.
    - The .env file is loaded automatically when Flask starts (see app.py).

Two modes, chosen by the FLASK_ENV variable:
    - development (the default): friendly fallbacks so it runs on your laptop.
    - production: the app refuses to start unless real secrets are set.
"""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def _get(name, default=None):
    """Return an env var, falling back to a default."""
    return os.environ.get(name, default)


def is_production():
    """True when FLASK_ENV=production (set this on the hosting service)."""
    return _get("FLASK_ENV", "development").lower() == "production"


def _database_url():
    """The database address, in the form SQLAlchemy needs for the psycopg driver."""
    url = _get("DATABASE_URL", "")
    if not url:
        return "postgresql+psycopg://postgres:postgres@localhost:5432/campus_marketplace"
    # Hosting services usually hand out postgres:// or postgresql://.
    # This project uses the psycopg (v3) driver, which needs postgresql+psycopg://.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


class Config:
    """Base / development configuration."""

    # --- Database ---
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Hosted databases close idle connections. Test a connection before using it
    # (pool_pre_ping) and replace old ones (pool_recycle), so the first request
    # after a quiet period doesn't fail.
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 1800}

    # --- Rate limiting (Flask-Limiter) ---
    # Counters live in memory by default. With several server workers, each keeps
    # its own count; set RATELIMIT_STORAGE_URI (for example to a Redis address) to
    # share one count across all of them.
    RATELIMIT_STORAGE_URI = _get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True
    RATELIMIT_ENABLED = _get("RATELIMIT_ENABLED", "true").lower() != "false"

    # --- App ---
    SECRET_KEY = _get("SECRET_KEY", "dev-secret-key")
    FLASK_ENV = _get("FLASK_ENV", "development")

    # --- JWT ---
    JWT_SECRET_KEY = _get("JWT_SECRET_KEY", "dev-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=3)  # stay logged in for three days
    JWT_ADMIN_TOKEN_EXPIRES = timedelta(hours=24)  # admins: fixed, counted from sign-in
    SUPPORT_EMAIL = _get("SUPPORT_EMAIL", "support.unimart.ng@gmail.com")

    # --- Uploads ---
    # UPLOAD_FOLDER can point at a permanent disk on the host.
    UPLOAD_FOLDER = Path(_get("UPLOAD_FOLDER", str(BASE_DIR / "uploads")))
    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    # Up to 5 photos of 5 MB each, plus a little room for the form's other fields.
    MAX_CONTENT_LENGTH = 26 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def check_production_settings(config):
    """Refuse to start in production with missing or placeholder secrets.

    Without this, the app would quietly fall back to made-up keys that anyone
    could guess, and anyone could then forge a login.
    """
    problems = []

    weak_markers = ("change-me", "dev-secret", "dev-jwt")
    for name in ("SECRET_KEY", "JWT_SECRET_KEY"):
        value = config.get(name) or ""
        if len(value) < 32 or any(marker in value.lower() for marker in weak_markers):
            problems.append(f"{name} must be a long random value (at least 32 characters)")

    if config.get("SECRET_KEY") == config.get("JWT_SECRET_KEY"):
        problems.append("SECRET_KEY and JWT_SECRET_KEY must be different from each other")

    database_url = _get("DATABASE_URL", "")
    if not database_url or "USER:PASSWORD" in database_url:
        problems.append("DATABASE_URL must be set to your production database")

    if problems:
        raise RuntimeError(
            "Unsafe production configuration:\n - " + "\n - ".join(problems)
        )
