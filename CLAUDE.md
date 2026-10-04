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

## MVP features
- Sign up / login (students only)
- Create, edit, and delete a listing (title, price, category, description, photos)
- Browse listings with search, category filter, and sorting
- Listing detail page with a "contact seller" button (WhatsApp link)
- "My listings" page for sellers to manage their items
- Mark a listing as sold

## Rules
- Propose a plan and wait for my approval before editing anything bigger than a small fix.
- Work one build step at a time, then stop and show me it working.
- Keep changes small and focused; don't refactor unrelated code.
- Show me any database schema change before applying it.
- Explain the cause of any bug you fix.
- Everything stays local for now; don't set up deployment.
