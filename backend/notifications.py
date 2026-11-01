"""Emails to students.

Sent from a background thread, so the admin who clicks Approve or Reject never waits
for the mail server, and a mail problem can never undo or block the decision.

Two ways to send, chosen by what is in backend/.env:
  - Brevo's web API (BREVO_API_KEY): ordinary HTTPS, so it works where SMTP ports are
    blocked, which is common on home Wi-Fi, campus networks and some hosts.
  - Plain SMTP (MAIL_SERVER, MAIL_USERNAME, MAIL_PASSWORD): any email account that
    offers it, for example Gmail with an app password.
If neither is set up, nothing is sent and the app carries on: students still see the
result under "My listings".
"""
import functools
import json
import logging
import smtplib
import threading
import urllib.error
import urllib.request
from email.message import EmailMessage
from email.utils import parseaddr

from flask import current_app

from config import is_production

log = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _never_raise(function):
    """Emails are a courtesy: a problem while preparing one must never break an approval."""

    @functools.wraps(function)
    def wrapper(*args, **kwargs):
        try:
            return function(*args, **kwargs)
        except Exception:
            current_app.logger.exception("Could not prepare a notification email")

    return wrapper


def build_settings(config):
    """The mail settings from the app config, or None when email is not set up."""
    sender = config.get("MAIL_FROM") or config.get("MAIL_USERNAME") or config.get("SUPPORT_EMAIL") or ""

    if config.get("BREVO_API_KEY"):
        name, address = parseaddr(sender)
        if not address:
            return None
        return {
            "kind": "brevo",
            "api_key": config["BREVO_API_KEY"],
            "from_name": name or "UniMart",
            "from_address": address,
        }

    if config.get("MAIL_SERVER") and config.get("MAIL_USERNAME") and config.get("MAIL_PASSWORD"):
        return {
            "kind": "smtp",
            "server": config["MAIL_SERVER"],
            "port": int(config.get("MAIL_PORT") or 587),
            "username": config["MAIL_USERNAME"],
            "password": config["MAIL_PASSWORD"],
            "from": sender,
        }

    return None


def describe(settings):
    """One line saying how mail will be sent (for the test script)."""
    if settings["kind"] == "brevo":
        return f"Brevo web API as {settings['from_address']}"
    return f"SMTP {settings['server']}:{settings['port']} as {settings['username']}"


def _deliver_brevo(settings, to_address, subject, body):
    payload = json.dumps(
        {
            "sender": {"name": settings["from_name"], "email": settings["from_address"]},
            "to": [{"email": to_address}],
            "subject": subject,
            "textContent": body,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        BREVO_URL,
        data=payload,
        method="POST",
        headers={
            "api-key": settings["api_key"],
            "content-type": "application/json",
            "accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"Brevo refused the email ({error.code}): {detail}") from error


def _deliver_smtp(settings, to_address, subject, body):
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings["from"]
    message["To"] = to_address
    message.set_content(body)

    # Port 465 starts encrypted; the usual port 587 starts plain and then upgrades.
    if settings["port"] == 465:
        connection = smtplib.SMTP_SSL(settings["server"], settings["port"], timeout=15)
    else:
        connection = smtplib.SMTP(settings["server"], settings["port"], timeout=15)

    with connection as server:
        if settings["port"] != 465:
            server.starttls()
        server.login(settings["username"], settings["password"])
        server.send_message(message)


def deliver(settings, to_address, subject, body):
    """Send one email now. Raises if it fails (the test script wants to see why)."""
    if settings["kind"] == "brevo":
        _deliver_brevo(settings, to_address, subject, body)
    else:
        _deliver_smtp(settings, to_address, subject, body)


def _deliver_quietly(settings, to_address, subject, body, logger):
    try:
        deliver(settings, to_address, subject, body)
        logger.info("Email sent to %s (%s)", to_address, subject)
    except Exception:
        # Never let a mail problem reach the person who clicked Approve or Reject.
        logger.exception("Could not send an email to %s", to_address)


def send_email(to_address, subject, body):
    """Send in the background. Returns False when email is not set up."""
    logger = current_app.logger
    settings = build_settings(current_app.config)
    if settings is None:
        logger.warning(
            "Email is not set up, so nothing was sent to %s (%s). Check backend/.env and "
            "restart the backend.",
            to_address,
            subject,
        )
        return False
    logger.info("Sending an email to %s (%s) ...", to_address, subject)
    threading.Thread(
        target=_deliver_quietly,
        args=(settings, to_address, subject, body, logger),
        daemon=True,
    ).start()
    return True


def _first_name(user):
    parts = (user.full_name or "").split()
    return parts[0] if parts else "there"


def _site(path=""):
    return current_app.config["FRONTEND_URL"].rstrip("/") + path


_FOOTER = (
    "\nThis message was sent because you posted a listing on UniMart.\n"
    "Questions? Write to {support}.\n"
)


@_never_raise
def send_password_reset_email(user):
    """The "reset your password" message. The link works once and for one hour."""
    from verification import make_reset_token

    link = _site(f"/reset-password?token={make_reset_token(user)}")
    body = (
        f"Hi {_first_name(user)},\n\n"
        "Someone asked to reset the password for your UniMart account. To choose a new "
        "password, open this link:\n\n"
        f"{link}\n\n"
        "The link works once and expires in 1 hour. If you did not ask for this, you can "
        "ignore this message: your password has not been changed.\n\n"
        f"Questions? Write to {current_app.config['SUPPORT_EMAIL']}.\n"
    )
    sent = send_email(user.email, "Reset your UniMart password", body)
    if not sent and not is_production():
        # On your own computer, with email not set up, the link is shown here instead.
        current_app.logger.warning("Password reset link for %s: %s", user.email, link)


@_never_raise
def send_password_changed_email(user):
    """Sent after a reset, so the owner notices if it was not them."""
    support = current_app.config["SUPPORT_EMAIL"]
    body = (
        f"Hi {_first_name(user)},\n\n"
        "The password for your UniMart account was just changed, and you were logged out "
        "on all devices.\n\n"
        f"If this was you, there is nothing more to do. If it was not, write to {support} "
        "straight away.\n"
    )
    send_email(user.email, "Your UniMart password was changed", body)


@_never_raise
def send_verification_email(user):
    """The "confirm your email" message sent at signup (and by the Resend button)."""
    from verification import make_token

    link = _site(f"/verify-email?token={make_token(user)}")
    body = (
        f"Hi {_first_name(user)},\n\n"
        "Welcome to UniMart! Please confirm your email address so you can post listings:\n\n"
        f"{link}\n\n"
        "The link works for 48 hours. If you did not create a UniMart account, you can "
        "ignore this message.\n\n"
        f"Questions? Write to {current_app.config['SUPPORT_EMAIL']}.\n"
    )
    sent = send_email(user.email, "Confirm your UniMart email", body)
    if not sent and not is_production():
        # On your own computer, with email not set up, the link is shown here instead.
        current_app.logger.warning("Verification link for %s: %s", user.email, link)


@_never_raise
def notify_listing_approved(listing):
    seller = listing.seller
    # A suspended student cannot see their listing, so do not tell them it is live.
    if seller.is_suspended:
        current_app.logger.info("No approval email: %s is suspended", seller.email)
        return
    body = (
        f"Hi {_first_name(seller)},\n\n"
        f'Good news: your listing "{listing.title}" has been approved and is now live on UniMart.\n\n'
        f"See it here: {_site(f'/listings/{listing.id}')}\n"
        + _FOOTER.format(support=current_app.config["SUPPORT_EMAIL"])
    )
    send_email(seller.email, "Your UniMart listing is live", body)


@_never_raise
def notify_listing_rejected(listing, reason):
    seller = listing.seller
    if seller.is_suspended:
        return
    body = (
        f"Hi {_first_name(seller)},\n\n"
        f'A moderator reviewed your listing "{listing.title}" and could not approve it yet.\n\n'
        f"Reason: {reason}\n\n"
        "You can fix it and send it for review again: open your listings, choose Edit on this "
        "listing and save your changes.\n\n"
        f"Your listings: {_site('/my-listings')}\n"
        + _FOOTER.format(support=current_app.config["SUPPORT_EMAIL"])
    )
    send_email(seller.email, "Your UniMart listing needs changes", body)
