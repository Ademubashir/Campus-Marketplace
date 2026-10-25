"""SQLAlchemy models for the UniMart MVP.

Notes approved in plan:
- users.phone required (international format, app validates)
- users.university required
- listing.status CHECK constraint ('available', 'sold')
- cascade delete: listing_photos removed when listing is deleted
- photos validated by upload type/size (handled in routes)
"""
from werkzeug.security import generate_password_hash, check_password_hash
from database import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)  # international format, e.g. +1-555-123-4567
    university = db.Column(db.String(100), nullable=False)  # required per plan
    # Raised by one to log this user out of every device (lost phone, password change).
    token_version = db.Column(
        db.Integer, nullable=False, default=0, server_default="0"
    )
    # Set by an admin. A suspended student cannot log in, and their listings are hidden.
    is_suspended = db.Column(
        db.Boolean, nullable=False, default=False, server_default=db.text("false")
    )
    suspension_reason = db.Column(db.Text)  # shown to the student, so keep it polite
    suspended_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now()
    )

    # Relationships
    listings = db.relationship(
        "Listing", back_populates="seller", cascade="all, delete-orphan"
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email}>"


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    slug = db.Column(db.String(50), unique=True, nullable=False)
    # Hidden categories can't be chosen for new listings; existing listings stay visible.
    is_hidden = db.Column(
        db.Boolean, nullable=False, default=False, server_default=db.text("false")
    )

    listings = db.relationship("Listing", back_populates="category")

    def __repr__(self):
        return f"<Category {self.name}>"


class Listing(db.Model):
    __tablename__ = "listings"
    __table_args__ = (
        db.CheckConstraint(
            "status IN ('available', 'sold')", name="ck_listings_status"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id"), nullable=False
    )
    description = db.Column(db.Text)
    condition = db.Column(db.String(20))  # e.g. 'new', 'used', 'like new'
    status = db.Column(
        db.String(10), nullable=False, server_default="available"
    )  # CHECK constraint applied in migration

    # Timestamps
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now()
    )

    # Relationships
    seller = db.relationship("User", back_populates="listings")
    category = db.relationship("Category", back_populates="listings")
    photos = db.relationship(
        "ListingPhoto",
        back_populates="listing",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="ListingPhoto.sort_order",
    )

    def __repr__(self):
        return f"<Listing {self.title}>"


class ListingPhoto(db.Model):
    __tablename__ = "listing_photos"

    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(
        db.Integer, db.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False
    )
    url = db.Column(db.Text, nullable=False)  # stored under backend/uploads/
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    listing = db.relationship("Listing", back_populates="photos")

    def __repr__(self):
        return f"<ListingPhoto {self.id} for listing {self.listing_id}>"


class Admin(db.Model):
    """Accounts for the admin area. Kept apart from student accounts on purpose:
    a student can never sign in as an admin, and an admin is not a student."""

    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(
        db.Boolean, nullable=False, default=True, server_default=db.text("true")
    )
    # True for a new admin until they choose their own password at first sign-in.
    must_change_password = db.Column(
        db.Boolean, nullable=False, default=False, server_default=db.text("false")
    )
    # Raised by one to end every login this admin has (logout, password change).
    token_version = db.Column(
        db.Integer, nullable=False, default=0, server_default="0"
    )
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    last_login_at = db.Column(db.DateTime)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<Admin {self.email}>"


class AdminAction(db.Model):
    """The log: one row for everything an admin does (suspend, reinstate, delete...)."""

    __tablename__ = "admin_actions"

    id = db.Column(db.Integer, primary_key=True)
    # The admin may be removed later; the name is saved so the log stays readable.
    admin_id = db.Column(db.Integer, db.ForeignKey("admins.id", ondelete="SET NULL"))
    admin_name = db.Column(db.String(100), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # e.g. suspend_user
    target_type = db.Column(db.String(30), nullable=False)  # user, listing, category, admin
    target_id = db.Column(db.Integer)
    # What the target was called at the time (a listing may be deleted afterwards).
    target_label = db.Column(db.String(255))
    reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), index=True)

    def __repr__(self):
        return f"<AdminAction {self.action} by {self.admin_name}>"
