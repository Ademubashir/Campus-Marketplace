# Campus Marketplace

A web app where university students buy and sell items (textbooks, gadgets, clothes, furniture) with each other. Buyers contact sellers directly on WhatsApp, so there is no chat system to build or run.

## Features

- **Accounts:** sign up and log in, change password, and log out of all other devices if a phone is lost.
- **Phone numbers the way people write them:** sign up with `0801 234 5678`; the app stores `+2348012345678`, which WhatsApp links need.
- **Listings:** post, edit, delete and mark as sold, with up to 5 photos each (checked by real file content, 5 MB each).
- **Browse:** search, category filter, sorting and pages. Sold items stay in the list after the available ones, with a round "Sold" badge.
- **Listing page:** photo gallery, seller card, safety tip, and a "Contact seller on WhatsApp" button that opens a chat with a ready-made message. On phones the button stays fixed at the bottom of the screen.
- **Login-only browsing:** the listings and sellers' contact details are only visible to logged-in users, both on the screen and in the API.
- **Made for phones:** responsive layout, a bottom tab bar, and a custom dropdown and notification system.

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React, Vite, React Router, plain CSS (design tokens as CSS variables), Font Awesome |
| Backend | Python, Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-CORS |
| Database | PostgreSQL |

## Project structure

```
backend/     Flask API (routes/, models.py, migrations/, uploads/)
frontend/    React app (src/pages, src/components, src/index.css)
CLAUDE.md    Notes for AI coding assistants working on this repo
```

## Run it on your own computer

You need **Python 3**, **Node.js** and **PostgreSQL** installed.

### 1. Database

Create an empty database named `campus_marketplace` (for example with `psql` or pgAdmin).

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill it in (your database password and two long random secret keys; the file explains how to generate them). Then create the tables:

```bash
python -m flask --app app db upgrade
```

Add the categories (run this in `psql` against `campus_marketplace`):

```sql
INSERT INTO categories (name, slug) VALUES
  ('Textbooks', 'textbooks'), ('Electronics', 'electronics'), ('Clothing', 'clothing'),
  ('Furniture', 'furniture'), ('Sports', 'sports'), ('Other', 'other');
```

Start the API on port 5000:

```bash
python app.py
```

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). Vite forwards `/api` requests to the Flask server, so no extra setup is needed.

To try it on a phone, expose the Vite port with a tunnel such as `ngrok http 5173`.

## Security notes

- Passwords are stored as salted hashes, never in plain text.
- Login tokens last 3 days and carry a version number, so a user can cut off every other device at once.
- Uploaded photos get random file names and are checked by their actual content.
- Secrets live in `backend/.env`, which is not committed.

## Status

Works end to end on desktop and on phones. Not deployed yet. Still to do: forgot-password by email, reporting a listing, previewing and removing single photos, and a production setup (production server, permanent photo storage, rate limiting).
