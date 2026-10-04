"""Flask-SQLAlchemy instance and Flask-Migrate setup.

The ``db`` object is imported throughout the app. ``migrate`` wires up
Flask-Migrate so that database migrations are generated from model changes.
"""
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()


def init_db(app):
    """Bind the db and migrate objects to a Flask app."""
    db.init_app(app)
    migrate.init_app(app, db)
    return db, migrate
