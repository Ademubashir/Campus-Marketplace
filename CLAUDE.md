# UniMart

Web app where students buy and sell items (textbooks, gadgets, clothes) within a university. Buyers contact sellers on WhatsApp.

## Stack
- Frontend: React + Vite (JavaScript, plain CSS, no TypeScript)
- Backend: Flask + SQLAlchemy + Flask-Migrate
- Database: PostgreSQL (native install, no Docker), database name `campus_marketplace`. Never touch `classcheck_saas`.

## Environment
- Windows laptop. The Bash tool runs Git Bash, so use bash syntax in commands.
- For Windows-only things (services, PowerShell cmdlets), call them through `powershell -Command "..."`.
- Run the backend from the `backend` folder: `python app.py`
- Run Flask commands as `python -m flask --app app ...` (the `flask` command is not on PATH)
- Run the frontend from the `frontend` folder: `npm run dev` (Vite proxies `/api` to port 5000). Only one copy should run (port 5173).
- Phone testing goes through one ngrok tunnel to the Vite port: `ngrok http 5173`
- Database driver is `psycopg` (v3); the URL prefix is `postgresql+psycopg://`
- Backend code uses top-level imports (`from models import ...`), never relative `..` imports
- Any change to `backend/models.py` needs a Flask-Migrate migration (`db migrate`, check the file, `db upgrade`).
- Run `python seed.py` (in `backend`) to create the categories on an empty database. It is safe to repeat.

## Production
- `FLASK_ENV=production` makes the app refuse to start unless `SECRET_KEY`, `JWT_SECRET_KEY` (32+ characters, different) and `DATABASE_URL` are real. Never add fallback secrets.
- Flask serves the built React site (`frontend/dist`) and the API from one address; CORS is off in production. After frontend changes, run `npm run build` in `frontend`.
- The host runs `gunicorn wsgi:app` from `backend` (settings in `gunicorn.conf.py`). `python app.py` is for local use only.
- Photos go to the `UPLOAD_FOLDER` setting. On a host this must be a permanent disk or photos are lost on restart.
- Rate limits (Flask-Limiter, in `extensions.py`): wrong logins counted per email, signups per address. Counters are in memory unless `RATELIMIT_STORAGE_URI` is set.
- Behind the host's proxy, `TRUSTED_PROXIES` (default 1) lets the app see the real visitor address.

## How it works
- **Auth:** JWT in localStorage, valid 3 days. Each user has a `token_version`; tokens carry it (`tv` claim), and raising it logs the user out of every device. Passwords need at least 8 characters. Emails are compared in lower case.
- **Phone numbers:** people type local numbers (0801 234 5678). Signup converts them to `+234...` (`normalize_phone` in `utils.py`), which the WhatsApp link needs.
- **Login gate:** Browse, listing detail, Sell, Edit, My listings and Profile need a login (`ProtectedRoute` on the screen, `@jwt_required()` on the API). Home and Login are public. Listing photos are public files with random names.
- **Expired login:** `api.js` fires an `auth:expired` event on a 401 and `AuthContext` logs the user out.
- **Sold items:** they stay in Browse, listed after available ones, with a round red "Sold" badge. The Home "Newest" row asks for `status=available`.

## API (all under /api/v1)
- Auth: `POST /auth/signup`, `POST /auth/login`
- Public: `GET /categories`, `GET /listings/photos/<file>`
- Listings (login needed): `GET /listings` (q, category_id, sort, page, limit, status), `GET /listings/:id`, `POST /listings`, `PATCH /listings/:id`, `DELETE /listings/:id`, `PATCH /listings/:id/sold`, `POST /listings/:id/photos`, `DELETE /listings/:id/photos/:photo_id`
- Users: `GET /users/me`, `GET /users/me/listings`, `POST /users/me/password`, `POST /users/me/logout-others`
- Errors always look like `{"error": "..."}`. A wrong current password returns 400, not 401 (a 401 would log the user out).

## Frontend
- Pages: Home, Login (login and signup tabs), Browse, ListingDetail, CreateListing, EditListing, MyListings, Profile.
- Shared: Navbar (top bar plus a phone bottom bar), ProtectedRoute, ListingCard, Dropdown.
- Styling: CSS variables at the top of `src/index.css` (indigo `--primary`, amber `--accent`, WhatsApp green). Never hard-code colors. Icons come from Font Awesome (solid set installed; the brands set is not).
- Use the custom `Dropdown` component, not a native `<select>`.
- Buttons have a shared hover and press effect in `index.css`.

## Progress
- Done: backend (setup, tables, auth, listings, photos, browse, sold items, profile, change password, log out other devices) and the whole React frontend (all pages above), tested on desktop and on a phone through ngrok. Final touches are done (tab title and icon, footer, Terms and Privacy, empty states, skeletons, 404). Production hardening is done (required secrets, debug off, one address, rate limits, seed script, gunicorn).
- Design is done: palette, fonts, Home page, navbar, custom dropdown, button effects, show/hide password, toasts, listing page upgrades.
- Next: choose a host (including permanent photo storage), deploy, then forgot-password by email, report a listing, photo previews and removing a single photo.

## Rules
- Never read, print, or ask for the contents of `backend/.env` or any password. I edit `.env` myself.
- Propose a plan and wait for my approval before editing anything bigger than a small fix.
- Work one build step at a time, then stop and show me it working.
- Keep changes small and focused; don't refactor unrelated code.
- Show me any database schema change before applying it.
- Don't start dev servers or run long commands; I test myself.
- Explain the cause of any bug you fix. I'm learning React, so keep explanations short and clear.
- Don't set up a specific host (Procfile, render.yaml, and so on) until I have chosen one.
