"""Add the starting categories to the database.

Run this once on a new, empty database, after the tables have been created:

    python seed.py

It is safe to run again: a category that already exists is skipped, so nothing is
duplicated. To add a new category later, add one line to CATEGORIES and run it again.
"""
from app import create_app
from database import db
from models import Category

# (name shown on the site, slug used inside the app)
CATEGORIES = [
    ("Textbooks", "textbooks"),
    ("Electronics", "electronics"),
    ("Clothing", "clothing"),
    ("Furniture", "furniture"),
    ("Sports", "sports"),
    ("Other", "other"),
]


def seed_categories():
    added = 0
    for name, slug in CATEGORIES:
        if not Category.query.filter_by(slug=slug).first():
            db.session.add(Category(name=name, slug=slug))
            added += 1
    db.session.commit()
    return added


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        added = seed_categories()
    if added:
        print(f"Added {added} categories.")
    else:
        print("All categories already exist. Nothing to do.")
