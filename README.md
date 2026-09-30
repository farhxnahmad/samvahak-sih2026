# SAMVAHAK — combined workspace

This folder holds both halves of the project, side by side:

    samvahak/
      frontend/   Next.js command center (the map views you've seen)
      backend/    Express + TypeScript + MongoDB API

They are **not deeply merged into one data layer.** The frontend's six map views
(Corridors, Risk, Isolation, Supply, Disaster, Co-Pilot) run entirely on sample data
built into the frontend itself — a fixed set of roads, villages and depots — so they
work with no backend running at all. The backend is a separate, real API (auth,
geography, incidents, alerts, risk scores, simulations, an AI copilot) backed by
MongoDB, with its own seed data.

What this workspace actually connects: a **"Backend live / offline" badge** in the
frontend's header, which calls the real backend's `/health`, `/states`,
`/dashboard/active-incidents` and `/dashboard/alert-statistics` endpoints. That's a
genuine, working connection between the two — not a placeholder — but it stops at
a status badge. See "Connecting the rest of the frontend to the backend" below for
what a full merge would take and why it isn't done here.

## 1. Install prerequisites

- **Node.js 18.17 or newer** — check with `node -v`
- **MongoDB**, one of:
  - installed locally and running on `mongodb://127.0.0.1:27017`, or
  - a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster — use its connection string instead
- **VS Code**, ideally with the ESLint and Prettier extensions (not required to run)

## 2. Open the workspace

In VS Code: `File -> Open Folder...` and select the `samvahak` folder (the one containing
`frontend` and `backend`). Use `View -> Terminal` to open two terminals — one per project,
side by side — since both run at the same time.

## 3. Set up and run the backend

In the first terminal:

    cd backend
    npm install
    cp .env.example .env

Open the new `.env` file and fill in:

- `MONGODB_URI` — leave as `mongodb://127.0.0.1:27017/samvahak` for a local MongoDB,
  or paste your Atlas connection string
- `JWT_SECRET` — replace with any long random string
- `CLIENT_ORIGIN` — already set to `http://localhost:3000` to match the frontend

Everything else in `.env` (Cloudinary, Gemini, super admin) is optional — only needed
for image uploads, the backend's own AI copilot module, and creating a staff login.
Leave those blank to start.

Seed sample data, then start the server:

    npm run seed
    npm run dev

You should see `Samvahak API running on http://localhost:5000/api/v1`. Check it in a
browser: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)
should show `"success": true`.

## 4. Set up and run the frontend

In the second terminal:

    cd frontend
    npm install
    cp .env.local.example .env.local
    npm run dev

Open [http://localhost:3000](http://localhost:3000). In the header, next to "Sample
data", you should see a **"Backend live"** badge once the backend (step 3) is running —
hover it to see the database status and a few live counts. If the backend isn't
running, or `.env.local` is missing, it shows **"Backend offline"** and the rest of
the app still works normally on its sample data.

## Running both together, day to day

Two terminals, left running:

    # Terminal 1
    cd backend && npm run dev

    # Terminal 2
    cd frontend && npm run dev

Stop either with `Ctrl+C`. There's no required start order — the frontend just shows
"Backend offline" until the backend is up.

## Signing in

The frontend now has a real login screen, gated in front of the whole app
(`components/auth/LoginScreen.tsx`, wired in `components/CommandCenter.tsx`). It
calls the backend's actual auth endpoints — `POST /auth/register`, `POST
/auth/login`, `GET /auth/me` — not sample data, so the backend must be running
and reachable (see steps 3-4 above) for sign-in and account creation to work.

- **Create account** always creates a **citizen** account (the backend enforces
  this — see `backend/src/modules/auth/auth.service.ts`, `registerCitizen`).
  Staff roles (government officer, district officer, field reporter, super admin)
  can only be created by an existing super admin, via `POST /auth/staff` — there's
  no UI for that yet, only the API.
- **"Continue without signing in"** on the login screen skips straight to the app
  as a guest. This exists because the six map views (Corridors, Risk, Isolation,
  Supply, Disaster, Co-Pilot) run entirely on the frontend's own sample data and
  never call the backend for anything — an account isn't needed to use them, only
  to eventually save reports or act with a staff role once that's built.
- The session token is kept in the browser's `localStorage` (`samvahak.token`),
  so signing in persists across reloads until you sign out or clear storage.
- To get a super admin account for testing `/auth/staff` yourself, use the
  backend's own seed: `npm run seed:admin` in `backend/` (reads the
  `SUPER_ADMIN_*` values from `backend/.env`) — this is separate from the login
  screen and only needs to be done once.

## Connecting the rest of the frontend to the backend

Right now only the header badge talks to the backend. The six simulation views do
not, and wiring them up is a real project of its own, not a quick pass, because the
two sides model the world differently:

- The **frontend's** road network, villages, depots and district list are a fixed,
  hand-built dataset with specific coordinates and IDs (see `frontend/lib/data.ts`,
  `frontend/lib/isolation/seeds.ts`, `frontend/lib/supply/depots.ts`), designed so the
  route-planning, isolation and disaster engines have a consistent graph to compute
  over.
- The **backend's** States, Districts and Villages come from MongoDB, seeded with
  their own names, coordinates and IDs (`backend/src/scripts/seed.ts`), and don't
  share IDs or a road graph with the frontend's dataset at all.

Replacing the frontend's sample data with live backend data would mean either
rebuilding the backend's geography to match the frontend's road graph, or rewriting
the frontend's routing and simulation engines to work over whatever geography the
backend returns (which today has no road network, only points). Either is a
substantial task best scoped on its own — happy to help with it next if that's the
direction you want; the `frontend/lib/backend/client.ts` helper this badge uses is a
starting point for it.

## Building for production

Each side builds independently:

    cd backend && npm run build && npm start
    cd frontend && npm run build && npm start

Both still need their own `.env` / `.env.local` present, and the backend still needs
a reachable MongoDB.
