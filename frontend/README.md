# SEMS — Frontend

React 19 + TypeScript client for the **Society Event Management System (SEMS)** of the UMT Sialkot Computer Science Society. It talks to the FastAPI backend in `../backend`.

## Quick start

### 1. Install dependencies
```bash
npm install
```

### 2. Point the app at the backend
Create `frontend/.env.local` (never commit this file):
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
For a deployed backend, use its HTTPS address instead.

### 3. Run in development
```bash
npm run dev
```
The app opens at `http://localhost:3000`. The backend must be running and its `CORS_ORIGINS` must include this address.

### 4. Build for production
```bash
npm run build
```
Static files are generated in `dist/` and can be hosted on any static host. Set `VITE_API_BASE_URL` to the production API address before building.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server on port 3000 |
| `npm run build` | Type-checks and builds production assets into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | Runs `tsc --noEmit` to check for type errors |

## What the app does
- **Guests** browse published events and verify certificates by code.
- **Students** register for sessions, upload payment receipts, see their eligibility, and view their own certificates.
- **Admins** create events and sessions, review payments, mark attendance, and issue, revoke or reinstate certificates.
- **Super admins** also manage users and roles.

Meeting rooms are external links added to each session (several per session; each link can be public or visible to confirmed attendees only).

## Project structure
```text
frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── App.tsx               # Routing and application state
    ├── main.tsx              # React entry point
    ├── config.ts             # App configuration (DEMO_MODE must stay false)
    ├── types.ts              # Shared type definitions
    ├── index.css             # Global styles and theme tokens
    ├── components/           # UI (events, sessions, registration, reviews,
    │                         #  certificates, profile, users, dashboard)
    ├── services/             # All backend communication
    │   ├── apiClient.ts      # Central fetch client and auth/events API
    │   ├── eventService.ts   # Event loading and caching
    │   ├── registrationApi.ts# Registration, payments, attendance
    │   ├── certificateApi.ts # Certificates and verification
    │   ├── usersApi.ts       # User management
    │   └── eligibilityService.ts # Certificate eligibility rules
    └── utils/                # Routing, role checks, validators, fee status
```

## Notes for developers
- All requests to the backend go through `src/services/apiClient.ts`. Do not call `fetch` directly from components.
- Form validation lives in `src/utils/validators.ts` and mirrors the backend rules (email, 11-digit phone, roll number).
- Payment and fee labels are derived from the registration status returned by the backend; never hardcode them.
- Never commit `.env.local`, uploaded files or database dumps.