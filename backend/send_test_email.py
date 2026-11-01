"""Send one test email, to check the MAIL_* settings in backend/.env. Run it from the
backend folder:

    python send_test_email.py you@example.com

If it fails, the reason is printed here (a wrong app password, a blocked port, ...).
"""
import sys

from app import create_app
from notifications import build_settings, deliver, describe


def main():
    if len(sys.argv) != 2 or "@" not in sys.argv[1]:
        sys.exit("Usage: python send_test_email.py you@example.com")

    app = create_app()
    settings = build_settings(app.config)
    if settings is None:
        sys.exit(
            "Email is not set up. Add BREVO_API_KEY (or the MAIL_* values for SMTP) to "
            "backend/.env (see .env.example), then run this again."
        )

    print(f"Sending through {describe(settings)} ...")
    try:
        deliver(
            settings,
            sys.argv[1],
            "UniMart test email",
            "If you can read this, UniMart can send email to students.\n",
        )
    except Exception as error:
        sys.exit(f"It did not work: {error}")
    print("Sent. Check the inbox (and the spam folder) of", sys.argv[1])


if __name__ == "__main__":
    main()
