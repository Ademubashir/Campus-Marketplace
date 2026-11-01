"""Signed, expiring links for emails: confirming an email address and resetting a password.

A link holds a signed token. It cannot be forged without the app's SECRET_KEY, and it
stops working after its time limit.
"""
import hashlib

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

SALT = "verify-email"
MAX_AGE_SECONDS = 48 * 60 * 60  # a confirmation link works for two days

RESET_SALT = "reset-password"
RESET_MAX_AGE_SECONDS = 60 * 60  # a password reset link works for one hour


def _serializer(salt):
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=salt)


# ---------- confirming an email address ----------
def make_token(user):
    # The email address is inside the token, so a link for an old address stops working
    # if the address ever changes.
    return _serializer(SALT).dumps({"id": user.id, "email": user.email})


def read_token(token):
    """Returns (data, None) for a good token, or (None, "expired" or "invalid")."""
    try:
        return _serializer(SALT).loads(token, max_age=MAX_AGE_SECONDS), None
    except SignatureExpired:
        return None, "expired"
    except BadSignature:
        return None, "invalid"


# ---------- resetting a password ----------
def _password_fingerprint(user):
    """Changes whenever the password changes, so a reset link works only once."""
    return hashlib.sha256((user.password_hash or "").encode("utf-8")).hexdigest()[:16]


def make_reset_token(user):
    return _serializer(RESET_SALT).dumps({"id": user.id, "fp": _password_fingerprint(user)})


def read_reset_token(token):
    """Returns (data, None) for a good token, or (None, "expired" or "invalid")."""
    try:
        return _serializer(RESET_SALT).loads(token, max_age=RESET_MAX_AGE_SECONDS), None
    except SignatureExpired:
        return None, "expired"
    except BadSignature:
        return None, "invalid"


def reset_token_matches(user, data):
    """False once the password has changed since the link was made (the link is used up)."""
    return data.get("fp") == _password_fingerprint(user)
