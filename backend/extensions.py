"""Shared extension objects (kept here so routes can import them without loops)."""
import os

from flask import request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Counts requests per visitor address. The storage (memory by default) comes from
# the RATELIMIT_STORAGE_URI setting in config.py.
limiter = Limiter(key_func=get_remote_address)

# How many tries are allowed. Generous per address (many students share one campus
# Wi-Fi address), strict per account. Each can be changed with an environment variable.
LOGIN_IP_LIMIT = os.environ.get("LOGIN_IP_LIMIT", "120 per minute")
LOGIN_FAIL_LIMIT = os.environ.get("LOGIN_FAIL_LIMIT", "8 per 15 minutes")  # wrong passwords, per email
SIGNUP_LIMIT = os.environ.get("SIGNUP_LIMIT", "60 per hour")
PASSWORD_LIMIT = os.environ.get("PASSWORD_LIMIT", "10 per hour")  # wrong current password, per user


def email_key():
    """Count login tries per email address (falls back to the visitor address)."""
    data = request.get_json(silent=True) or {}
    email = str(data.get("email") or "").strip().lower()
    return f"email:{email}" if email else get_remote_address()


def user_key():
    """Count tries per logged-in user (falls back to the visitor address)."""
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
    except Exception:  # a bad token: the route itself will reject it
        identity = None
    return f"user:{identity}" if identity else get_remote_address()
