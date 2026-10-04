# Deploying ByaparDesk

The app is two independently deployable services plus two managed cloud dependencies you already have set up:

- **MongoDB Atlas** — already connected (`backend/.env` → `MONGO_URI`)
- **Cloudinary** — already connected (`backend/.env` → `CLOUDINARY_*`)
- **Backend** (`backend/`) — Node/Express API
- **Frontend** (`frontend/`) — Next.js app

## 1. Backend

Deploy `backend/` to any Node host (Railway, Render, Fly.io, etc.):

- Build command: `npm install`
- Start command: `npm start`
- Environment variables (copy from `backend/.env.example`):
  - `MONGO_URI` — your Atlas connection string
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `SESSION_SECRET` — a long random string (e.g. `openssl rand -hex 32`)
  - `FRONTEND_URL` — the frontend's deployed URL, set **after** step 2 (e.g. `https://byapardesk.vercel.app`) — required for CORS and cookies to work
  - `PORT` — usually set automatically by the host; the app falls back to 5000
  - `NODE_ENV=production` — enables secure cookies and `sameSite: none` for cross-origin auth

In **MongoDB Atlas → Network Access**, add an IP allowlist entry for your host (or `0.0.0.0/0` if the host uses dynamic IPs).

## 2. Frontend

Deploy `frontend/` to Vercel (or any Next.js host):

- Framework preset: Next.js (standard, not static export)
- Environment variable (copy from `frontend/.env.example`):
  - `NEXT_PUBLIC_API_URL` — the backend's deployed URL + `/api/v1` (e.g. `https://byapardesk-api.onrender.com/api/v1`)

## 3. Close the loop

Once the frontend has a live URL, set the backend's `FRONTEND_URL` env var to it and redeploy the backend so CORS/cookies allow it.

## Local development

From the project root: `npm run dev` runs both services together (backend on :5000, frontend on :3000), using `frontend/.env.local` and `backend/.env` for local config.
