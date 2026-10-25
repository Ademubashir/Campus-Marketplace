"""Create or manage admin accounts. Run it from the backend folder.

    python make_admin.py                     create an admin (asks for the details)
    python make_admin.py --must-change       same, but they must choose their own
                                             password the first time they sign in
    python make_admin.py --list              show every admin
    python make_admin.py --deactivate EMAIL  switch an admin off (ends their logins)
    python make_admin.py --activate EMAIL    switch an admin back on

The password is typed hidden, so it never appears on screen or in a file.
"""
import argparse
import getpass
import sys

from app import create_app
from database import db
from models import Admin


def find(email):
    return Admin.query.filter(db.func.lower(Admin.email) == email.strip().lower()).first()


def create(must_change):
    name = input("Name: ").strip()
    email = input("Email: ").strip().lower()
    if not name or "@" not in email or "." not in email.split("@")[-1]:
        sys.exit("A name and a valid email are needed.")
    if find(email):
        sys.exit("An admin with that email already exists.")
    password = getpass.getpass("Password (at least 8 characters, hidden): ")
    if len(password) < 8:
        sys.exit("The password must be at least 8 characters.")
    if getpass.getpass("Repeat the password: ") != password:
        sys.exit("The two passwords do not match.")

    admin = Admin(name=name, email=email, must_change_password=must_change)
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()
    print(f"Created admin {admin.name} <{admin.email}>.")
    if must_change:
        print("They must choose their own password the first time they sign in.")


def list_admins():
    admins = Admin.query.order_by(Admin.id).all()
    if not admins:
        print("There are no admins yet.")
    for a in admins:
        state = "active" if a.is_active else "switched off"
        extra = ", must change password" if a.must_change_password else ""
        print(f"{a.id}: {a.name} <{a.email}> ({state}{extra})")


def set_active(email, active):
    admin = find(email)
    if not admin:
        sys.exit("No admin with that email.")
    admin.is_active = active
    if not active:
        admin.token_version += 1  # ends their current logins
    db.session.commit()
    print(f"{admin.email} is now {'active' if active else 'switched off'}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage UniMart admin accounts")
    parser.add_argument("--must-change", action="store_true",
                        help="the new admin must choose their own password at first sign-in")
    parser.add_argument("--list", action="store_true", help="show every admin")
    parser.add_argument("--deactivate", metavar="EMAIL", help="switch an admin off")
    parser.add_argument("--activate", metavar="EMAIL", help="switch an admin back on")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        if args.list:
            list_admins()
        elif args.deactivate:
            set_active(args.deactivate, False)
        elif args.activate:
            set_active(args.activate, True)
        else:
            create(args.must_change)