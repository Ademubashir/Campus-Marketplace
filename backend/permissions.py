"""Admin roles and what each role may do.

An admin has exactly one role. The routes in routes/admin.py ask for a permission
by name (for example "users.suspend"), and this file decides which roles have it.
To change what a role can do, edit ROLE_PERMISSIONS below.
"""

SUPER_ADMIN = "super_admin"
MODERATOR = "moderator"
SUPPORT = "support"

ROLES = (SUPER_ADMIN, MODERATOR, SUPPORT)

ROLE_LABELS = {
    SUPER_ADMIN: "Super admin",
    MODERATOR: "Moderator",
    SUPPORT: "Support",
}

ALL_PERMISSIONS = (
    "users.view",
    "users.suspend",
    "listings.view",
    "listings.delete",
    "listings.review",  # approve or reject listings waiting to go online
    "categories.view",
    "categories.manage",
    "admins.manage",  # create admins, change roles, switch admins on or off
    "insights.view",  # the Insights charts
    "log.view",
)

ROLE_PERMISSIONS = {
    # Everything, including the things only a super admin should touch.
    SUPER_ADMIN: set(ALL_PERMISSIONS),
    # Looks after what is for sale.
    MODERATOR: {
        "listings.view",
        "listings.delete",
        "listings.review",
        "categories.view",
        "categories.manage",
    },
    # Looks after students.
    SUPPORT: {
        "users.view",
        "users.suspend",
        "listings.view",
        "categories.view",
    },
}


def permissions_for(role):
    """The permissions of a role. An unknown role gets none (the safe default)."""
    return ROLE_PERMISSIONS.get(role, set())


def can(role, permission):
    return permission in permissions_for(role)
