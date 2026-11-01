"""Create or manage admin accounts. Run it from the backend folder.

    python make_admin.py                     create an admin (asks for the details)
    python make_admin.py --role moderator    same, with a role: super_admin (the default
                                             here), moderator or support
    python make_admin.py --must-change       same, but they must choose their own
                                             password the first time they sign in
    python make_admin.py --list              show every admin and their role
    python make_admin.py --set-role EMAIL --role ROLE   change an admin's role
    python make_admin.py --reset-password EMAIL  reset an existing admin's password
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
from permissions import ROLES, ROLE_LABELS


def find(email):
    return Admin.query.filter(db.func.lower(Admin.email) == email.strip().lower()).first()


def create(must_change, role):
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

    admin = Admin(name=name, email=email, role=role, must_change_password=must_change)
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()
    print(f"Created admin {admin.name} <{admin.email}> as {ROLE_LABELS[role]}.")
    if must_change:
        print("They must choose their own password the first time they sign in.")


def list_admins():
    admins = Admin.query.order_by(Admin.id).all()
    if not admins:
        print("There are no admins yet.")
    for a in admins:
        state = "active" if a.is_active else "switched off"
        extra = ", must change password" if a.must_change_password else ""
        print(f"{a.id}: {a.name} <{a.email}> [{ROLE_LABELS.get(a.role, a.role)}] ({state}{extra})")


def set_active(email, active):
    admin = find(email)
    if not admin:
        sys.exit("No admin with that email.")
    admin.is_active = active
    if not active:
        admin.token_version += 1  # ends their current logins
    db.session.commit()
    print(f"{admin.email} is now {'active' if active else 'switched off'}.")


def set_role(email, role):
    admin = find(email)
    if not admin:
        sys.exit("No admin with that email.")
    if role not in ROLES:
        sys.exit(f"The role must be one of: {', '.join(ROLES)}.")
    if admin.role == role:
        sys.exit(f"{admin.email} is already {ROLE_LABELS[role]}.")
    admin.role = role
    admin.token_version += 1  # they sign in again and get the new role
    db.session.commit()
    print(f"{admin.email} is now {ROLE_LABELS[role]}. Their existing sessions have been ended.")


def reset_password(email):
    admin = find(email)
    if not admin:
        sys.exit("No admin with that email.")
    if not admin.is_active:
        sys.exit("That admin is switched off. Activate the account before resetting its password.")

    password = getpass.getpass("New password (at least 8 characters, hidden): ")
    if len(password) < 8:
        sys.exit("The password must be at least 8 characters.")
    if admin.check_password(password):
        sys.exit("Choose a password different from the current password.")
    if getpass.getpass("Repeat the new password: ") != password:
        sys.exit("The two passwords do not match.")

    admin.set_password(password)
    admin.must_change_password = False
    admin.token_version += 1  # ends every existing login for this admin
    db.session.commit()
    print(f"Password reset for {admin.email}. Existing sessions have been ended.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage UniMart admin accounts")
    parser.add_argument("--must-change", action="store_true",
                        help="the new admin must choose their own password at first sign-in")
    parser.add_argument("--list", action="store_true", help="show every admin")
    parser.add_argument("--reset-password", metavar="EMAIL", help="reset an existing admin's password")
    parser.add_argument("--deactivate", metavar="EMAIL", help="switch an admin off")
    parser.add_argument("--activate", metavar="EMAIL", help="switch an admin back on")
    parser.add_argument("--role", choices=ROLES,
                        help="the role for a new admin (default super_admin), or the new role with --set-role")
    parser.add_argument("--set-role", metavar="EMAIL", help="change an existing admin's role (use with --role)")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        if args.list:
            list_admins()
        elif args.set_role:
            if not args.role:
                sys.exit("Say which role with --role, for example --role moderator.")
            set_role(args.set_role, args.role)
        elif args.reset_password:
            reset_password(args.reset_password)
        elif args.deactivate:
            set_active(args.deactivate, False)
        elif args.activate:
            set_active(args.activate, True)
        else:
            create(args.must_change, args.role or "super_admin")
