"""Settings for the production server (gunicorn).

gunicorn reads this file by itself when it is started from the backend folder:

    gunicorn wsgi:app
"""
import os

# Hosting services tell the app which port to use through the PORT variable.
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"

# A small site: two workers, each handling a few requests at once.
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
threads = 4
timeout = 60

# Send logs to the host's log viewer.
accesslog = "-"
errorlog = "-"
loglevel = "info"
