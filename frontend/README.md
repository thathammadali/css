# 🌐 SEMS — Frontend Client Application

Standalone React 19 + TypeScript frontend for the **Session Management System (SEMS)**.

This repository contains the **pure frontend** code. It connects to the FastAPI backend API via configured tunnel/base URL or falls back gracefully to offline mock mode.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Backend API (Optional)
By default, the frontend connects to the backend tunnel configured in `src/services/apiClient.ts` or you can create a `.env` file:
```env
VITE_API_BASE_URL=https://your-backend-api-url.com
```
*(You can also configure or change the backend tunnel URL dynamically right inside the app via the **Tunnel & Origin** dialog on the Login screen without rebuilding).*

### 3. Run Locally (Development)
```bash
npm run dev
```
The app will launch at:
```
http://localhost:3000
```

### 4. Build for Production
To generate the static production assets (HTML/CSS/JS) for deployment to Vercel, Netlify, Cloudflare Pages, or GitHub Pages:
```bash
npm run build
```
Output files will be generated in the `/dist` folder.

---

## 📁 Frontend Directory Structure

```text
frontend/
├── index.html              # HTML entry point
├── vite.config.ts          # Vite build & plugin configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Frontend dependencies & scripts
│
├── public/                 # Static public assets
│
└── src/                    # Source code
    ├── App.tsx             # Main routing & application state
    ├── main.tsx            # React DOM root entry
    ├── types.ts            # Type definitions (Events, Sessions, Users)
    ├── index.css           # Global Tailwind CSS styles and theme tokens
    │
    ├── components/         # Reusable UI components
    │   ├── TopAppBar.tsx   # Top header & backend connection status badge
    │   ├── LoginPage.tsx   # Login, registration, & tunnel setup
    │   ├── SessionCard.tsx # Session cards (Speaker, Seats, Direct Join Link)
    │   ├── events/         # Event catalog & detail pages
    │   ├── sessions/       # Sessions list, detail, & live meeting rooms
    │   ├── certificates/   # Certificate issuance & verification
    │   ├── forms/          # Custom form builder
    │   └── users/          # User management
    │
    ├── services/           # Backend API communication
    │   ├── apiClient.ts    # Central fetch client (GET /events, POST /auth/login, etc.)
    │   ├── eventService.ts # Event caching and lifecycle management
    │   └── userService.ts  # Local user session and authentication
    │
    ├── data/               # Mock datasets for offline / fallback mode
    │   ├── mockEvents.ts   # Sample event catalog
    │   ├── mockSessions.ts # Sample sessions with speakers & attendance
    │   └── mockForms.ts    # Default registration forms
    │
    └── utils/              # Helper utilities (routing, role permissions)
        ├── router.ts       # Hash route parser (#/events, #/home)
        └── roleUtils.ts    # Role identification and access checks
```

---

## 🛠️ Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite local development server on port 3000 |
| `npm run build` | Compiles TypeScript and creates optimized production assets in `/dist` |
| `npm run preview` | Locally previews the production build from `/dist` |
| `npm run lint` | Runs TypeScript type-checker (`tsc --noEmit`) to verify zero errors |
