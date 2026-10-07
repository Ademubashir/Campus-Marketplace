# Campus Marketplace

Web app where students buy and sell items (textbooks, gadgets, clothes) within a university.

## Stack
- Frontend: React + Vite
- Backend: Flask + SQLAlchemy + Flask-Migrate
- Database: PostgreSQL (native install, no Docker), database name `campus_marketplace`. Never touch `classcheck_saas`.

## Environment
- Windows laptop. The Bash tool runs Git Bash, so use bash syntax in commands.
- For Windows-only things (services, PowerShell cmdlets), call them through `powershell -Command "..."`.
- Phone testing over an ngrok HTTPS tunnel
- Run the backend from the `backend` folder: `python app.py`
- Run Flask commands as `python -m flask --app app ...` (the `flask` command is not on PATH)
- Database driver is `psycopg` (v3); the URL prefix is `postgresql+psycopg://`
- Backend code uses top-level imports (`from models import ...`), never relative `..` imports
- JWT tokens expire quickly; log in again for a fresh token when testing
- Frontend: run with npm run dev in frontend/ (Vite proxies /api to port 5000)

## MVP features
- Sign up / login (students only)
- Create, edit, and delete a listing (title, price, category, description, photos)
- Browse listings with search, category filter, and sorting
- Listing detail page with a "contact seller" button (WhatsApp link)
- "My listings" page for sellers to manage their items
- Mark a listing as sold

## Progress
- Done: Step 1 setup, Step 2 backend skeleton (`/health`), Step 3 database tables (migrations applied, categories seeded), Step 4 auth (signup/login, tested), Step 5 listings create/edit/delete/mark-as-sold (tested, owner-only), Step 6 photo upload (validated by real file content, max 5 photos of 5 MB, stored in `backend/uploads/`)
- Next: Step 7 browse (search, filter, sort, pagination: route exists, needs testing), then the React frontend (Steps 8 to 13)
- Step 7 is done, Next is step 8 which is for frontend(React+vite)(steps 8 to 13)
- steps 1 to 8 done, step 9 (auth UI) next.
- Step 1-9 done. Step 10 next.

## Rules
- Never read, print, or ask for the contents of `backend/.env` or any password. I edit `.env` myself.
- Propose a plan and wait for my approval before editing anything bigger than a small fix.
- Work one build step at a time, then stop and show me it working.
- Keep changes small and focused; don't refactor unrelated code.
- Show me any database schema change before applying it.
- Explain the cause of any bug you fix.
- Everything stays local for now; don't set up deployment.