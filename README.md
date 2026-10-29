# CSS Society — SEMS

**Society Event Management System** for the UMT SKT Computer Science Society (CSS). It handles events and sessions, student registration, manual payment approval, attendance, and verifiable certificates.

**Stack:** Vite + React (TypeScript), FastAPI, PostgreSQL 16

## Structure
- `frontend/` — Vite + React app by Zainab (see `frontend/README.md`)
- `backend/` — FastAPI app by Areeha

## Roles
- **Guest** (not logged in): browses published events, verifies certificates by code
- **Student**: registers for sessions, uploads payment receipts, views own certificates
- **Admin**: creates events and sessions, approves payments, marks attendance, issues certificates
- **Super admin**: all admin actions, plus manages users and roles

Public signup only creates students. Admins are promoted by a super admin from the Users page.

## Requirements
- Python 3.11+
- Node.js 20+
- PostgreSQL 16

## Backend setup
```bash
cd backend
python -m venv ../.venv
../.venv/Scripts/activate          # Windows: ..\.venv\Scripts\activate
pip install -r requirements.txt
```

1. Create a PostgreSQL database and user (for example `sems_db` and `sems_user`).
2. Copy `.env.example` (in the repository root) to `.env` and fill in the values. Use a long random `JWT_SECRET`. Never commit `.env`.
3. Create the tables and roles: `alembic upgrade head` (run from `backend/`).
4. Create the first super admin: `python scripts/create_super_admin.py` (it asks for the details and password).
5. Start the API from `backend/`: `uvicorn main:app --reload`

API docs are at http://127.0.0.1:8000/docs

## Frontend setup
```bash
cd frontend
npm install
```
Create `frontend/.env.local` containing `VITE_API_BASE_URL=http://127.0.0.1:8000`, then run `npm run dev`. The app opens at http://localhost:3000.

## First use
1. Log in as the super admin.
2. Students sign up themselves. Promote admins from the **Users** page.
3. An admin creates an event, adds sessions (with meeting links), and publishes it.
4. Students register. For paid events they upload a receipt and an admin approves or rejects it.
5. After the session, the admin marks attendance and issues certificates. Anyone can verify a certificate by its code.

## Security notes
- Passwords are hashed with bcrypt. Login and signup are rate-limited.
- Uploaded receipts and assignments are stored on the server under `backend/uploads/` and are not publicly listed.
- In production set `ENV=production`, set `CORS_ORIGINS` to the real frontend address, and serve everything over HTTPS.
- Back up the database regularly: `pg_dump -U sems_user sems_db > backup.dump`. Never commit dumps, `.env` or uploads.

## Checks
- Frontend type check (in `frontend/`): `npx tsc --noEmit`
- Authorization check (in `backend/`): set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STUDENT_EMAIL`, `STUDENT_PASSWORD`, then run `python scripts/authz_check.py`