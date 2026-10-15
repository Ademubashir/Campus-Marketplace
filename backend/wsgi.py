"""Entry point for the production server.

On the hosting service the start command is:

    gunicorn wsgi:app
"""
from app import create_app

app = create_app()
