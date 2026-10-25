"""Password and phone-number helpers."""
import re
from flask import current_app
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash


def hash_password(plain_password):
    return generate_password_hash(plain_password)


def verify_password(plain_password, password_hash):
    return check_password_hash(password_hash, plain_password)


def normalize_phone(raw):
    """Turn a phone number the way people type it into international form.

    '0801 234 5678'    -> '+2348012345678'
    '8012345678'       -> '+2348012345678'
    '2348012345678'    -> '+2348012345678'
    '+44 7700 900123'  -> '+447700900123' (other countries need a + or 00)

    Raises ValueError with a friendly message if it can't be a real number.
    """
    text = str(raw or "").strip()
    international = text.startswith("+") or text.startswith("00")
    digits = re.sub(r"\D", "", text)

    if not digits:
        raise ValueError("Phone number is required")

    if text.startswith("00"):
        digits = digits[2:]  # 0044... means +44...

    if not international:
        if digits.startswith("2340"):
            digits = "234" + digits[4:]  # 234 0801... -> 234 801...
        elif digits.startswith("234"):
            pass  # country code typed without the +
        elif digits.startswith("0"):
            digits = "234" + digits[1:]  # 0801... -> 234 801...
        else:
            digits = "234" + digits  # 801... -> 234 801...

    if digits.startswith("234"):
        if not re.fullmatch(r"234[789]\d{9}", digits):
            raise ValueError("Enter a valid phone number, like 0801 234 5678")
    elif not 8 <= len(digits) <= 15:
        raise ValueError("Enter a valid phone number")

    return "+" + digits


def issue_token(user):
    """A login token tied to the user's current token_version.

    If token_version is raised later (log out of all devices, password change),
    every token issued before that stops working.
    """
    return create_access_token(
        identity=str(user.id), additional_claims={"tv": user.token_version}
    )

def issue_admin_token(admin):
    """A 24-hour login token for an admin. The role claim keeps it off student routes."""
    return create_access_token(
        identity=str(admin.id),
        additional_claims={"tv": admin.token_version, "role": "admin"},
        expires_delta=current_app.config["JWT_ADMIN_TOKEN_EXPIRES"],
    )
