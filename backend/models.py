"""SQLAlchemy models for the Campus Marketplace MVP.

Notes approved in plan:
- users.phone required (international format, app validates)
- users.university required
- listing.status CHECK constraint ('available', 'sold')
- cascade delete: listing_photos removed when listing is deleted
- photos validated by upload type/size (handled in routes)
"""
from werkzeug.security import generate_password_hash, check_password_hash
from .database import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=False)  # international format, e.g. +1-555-123-4567
    university = db.Column(db.String(100), nullable=False)  # required per plan
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

    listings = db.relationship("Listing", back_populates="category")

    def __repr__(self):
        return f"<Category {self.name}>"


class Listing(db.Model):
    __tablename__ = "listings"

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
