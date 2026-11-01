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
2. Copy `.env.example` (in the repository root) to `.env` and fill in the values. Use a random `JWT_SECRET` of at least 32 characters (the app refuses to start with a shorter one or with the placeholder). Never commit `.env`.
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
6. Any logged-in user can change their password from the profile page (Change password: current password, new password, confirmation). The new password must be at least 8 characters, at most 72 bytes, and different from the current one.

## Deploying to a server
These steps assume Ubuntu, nginx and certbot. They are assumptions and have not been tested on any specific server. Adjust paths, names and domains to your setup. Examples use `sems.example.com` for the frontend and `api.sems.example.com` for the API.

**Do not use `docker-compose.yml` for production.** It is for local development only: the backend connects to the database at `localhost` (hardcoded in `backend/database.py`), the backend runs with `--reload`, port 5432 is published to the host, and the frontend runs the Vite dev server.

### 1. Install requirements
```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip postgresql nginx certbot python3-certbot-nginx git
```
Node.js 20+ is also needed to build the frontend (install it from NodeSource or `nvm`). Python 3.11+ and PostgreSQL 16 are required (see Requirements above); check with `python3 --version` and `psql --version`.

### 2. Create the database and user
Use a password made of letters and digits only. `backend/database.py` puts the password straight into the database URL, so characters such as `@`, `:`, `/` or `#` break it.
```bash
sudo -u postgres psql -c "CREATE USER sems_user WITH PASSWORD 'YourLettersAndDigits123';"
sudo -u postgres psql -c "CREATE DATABASE sems_db OWNER sems_user;"
```
The database must run on the same server as the backend, because `database.py` always connects to `localhost:5432`. Do not open port 5432 to the internet (keep it closed in the firewall; PostgreSQL listens on localhost by default).

### 3. Clone and install
```bash
sudo mkdir -p /opt/sems && sudo chown $USER /opt/sems
git clone <your-repository-url> /opt/sems
cd /opt/sems/backend
python3 -m venv ../.venv
../.venv/bin/pip install -r requirements.txt
```

### 4. Configure `.env`
```bash
cd /opt/sems
cp .env.example .env
```
Edit the `.env` file in the repository root:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: the values from step 2.
- `JWT_SECRET`: replace the example value with a new random one. Generate it with `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`. It must be at least 32 random characters; the backend refuses to start if it is missing, shorter, or still the `REPLACE_WITH...` placeholder.
- `CORS_ORIGINS`: the real frontend address, for example `https://sems.example.com`.
- `ACCESS_TOKEN_MINUTES`: optional, how long a login lasts (default 60).

Never commit `.env`.

### 5. Create the tables and the first super admin
If the database already holds data, back it up first (`pg_dump`, see Security notes).
```bash
cd /opt/sems/backend
../.venv/bin/alembic upgrade head
../.venv/bin/python scripts/create_super_admin.py
```
The person taking over the system should enter their own email and choose their own password at the prompt.

### 6. Run the API as a systemd service
Run uvicorn without `--reload`, bound to `127.0.0.1:8000` (only nginx talks to it), with `--proxy-headers --forwarded-allow-ips=127.0.0.1`. Without these flags the rate limiter sees every user as `127.0.0.1`, so all users share one IP-wide limit (for example the 120 failed logins per minute and 30 signups per minute), and a room of students on one campus address would count against each other. Example `/etc/systemd/system/sems.service`:
```ini
[Unit]
Description=SEMS API
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/opt/sems/backend
ExecStart=/opt/sems/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
The service user must be able to read the repository and write to `backend/uploads` (for example `sudo chown -R www-data /opt/sems/backend/uploads`). Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sems
sudo systemctl status sems
```
Uploaded receipts and assignments are stored in `backend/uploads/`. This folder must persist across deployments and be included in your backups.

### 7. Build the frontend
`VITE_API_BASE_URL` is baked into the build, so set it to the public API address when you build:
```bash
cd /opt/sems/frontend
npm install
VITE_API_BASE_URL=https://api.sems.example.com npm run build
```
The result is in `frontend/dist`. If the API address changes, rebuild.

### 8. nginx
The API has no `/api` prefix, so use two addresses: one for the frontend and one for the API (for example `sems.example.com` and `api.sems.example.com`), both pointing at the server.
```nginx
server {
    listen 80;
    server_name sems.example.com;
    root /opt/sems/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api.sems.example.com;
    client_max_body_size 10m;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
`client_max_body_size` must be larger than the 5 MB receipt limit, otherwise nginx rejects receipt uploads. Enable the site (a file in `/etc/nginx/sites-available/` linked from `sites-enabled/`), then run `sudo nginx -t && sudo systemctl reload nginx`.

Once HTTPS works (step 9), add this line inside both `server` blocks that certbot manages, to tell browsers to always use HTTPS:
```nginx
add_header Strict-Transport-Security "max-age=31536000" always;
```
The `--proxy-headers` flags in the systemd unit are what make the rate limiter use the real client address from `X-Forwarded-For`. Students sharing one public address are not blocked by each other's successful logins, because only failed logins are counted.

### 9. HTTPS
```bash
sudo certbot --nginx -d sems.example.com -d api.sems.example.com
```
Make sure `CORS_ORIGINS` uses the `https://` frontend address and that the frontend was built with the `https://` API address.

### 10. Smoke test
- [ ] `https://api.sems.example.com/health` returns `{"status":"ok"}`.
- [ ] `https://sems.example.com` loads, and refreshing a sub-page does not give a 404.
- [ ] You can log in as the super admin.
- [ ] A published test event is visible to a logged-out visitor.
- [ ] A student can sign up, register and upload a receipt (try a file close to 5 MB).
- [ ] An admin can approve the receipt.
- [ ] The browser console shows no CORS errors.
- [ ] `sudo ss -tlnp | grep 5432` shows PostgreSQL on `127.0.0.1` only.
- [ ] Test data is deleted afterwards.

### Updating later
Back up the database and `backend/uploads/` first, then:
```bash
cd /opt/sems
git pull
cd backend
../.venv/bin/pip install -r requirements.txt
../.venv/bin/alembic upgrade head
sudo systemctl restart sems
cd ../frontend
npm install
VITE_API_BASE_URL=https://api.sems.example.com npm run build
```
nginx serves the new `frontend/dist` straight away; no reload is needed.

## Known limitations
- There is no forgot-password by email. A super admin has to handle a forgotten password manually. There is no password reset script in this repository: `backend/scripts/` contains only `create_super_admin.py` (which does not change the password of an existing account) and `authz_check.py`, so recovery currently means updating the stored hash directly in the database.
- Fees and payment details are set per session. The event form has no fee field.
- The rate limiter is kept in memory, per process. Running several uvicorn workers multiplies every limit by the number of workers, so keep a single worker or move the limiter to a shared store.
- After a password change, tokens that were already issued stay valid until they expire (`ACCESS_TOKEN_MINUTES`, default 60).
- The `/docs` page (and `/openapi.json`) is public.
- There is no forgot-password by email (see the first point).

## Security notes
- Passwords are hashed with bcrypt. Rate limits (per minute): login counts only failed attempts, 10 per IP and email pair plus 120 per IP; signup allows 30 per IP and 3 per email; certificate verification allows 120 per IP; change password allows 5 per IP.
- Uploaded receipts and assignments are stored on the server under `backend/uploads/` and are not publicly listed.
- In production set `CORS_ORIGINS` to the real frontend address, serve everything over HTTPS, and use a strong `JWT_SECRET`.
- Back up the database regularly: `pg_dump -U sems_user sems_db > backup.dump`. Never commit dumps, `.env` or uploads.

## Checks
- Frontend type check (in `frontend/`): `npx tsc --noEmit`
- Authorization check (in `backend/`): set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STUDENT_EMAIL`, `STUDENT_PASSWORD`, then run `python scripts/authz_check.py`