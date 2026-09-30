# Samvahak Backend

Express + TypeScript + MongoDB (Mongoose). Local hackathon prototype.

## Run

    npm install
    cp .env.example .env
    npm run dev

Check: http://localhost:5000/api/v1/health

## Adding a feature module later

Create `src/modules/<feature>/` with:

    <feature>.model.ts        Mongoose schema + model
    <feature>.service.ts      business logic, talks to the model
    <feature>.controller.ts   reads req, calls service, sends res (wrap in asyncHandler)
    <feature>.routes.ts       Router, mounted in src/routes/v1.routes.ts

Throw `new AppError(404, "Not found")` anywhere; the global error handler formats it.

## Auth

    npm run seed:admin      creates the first super admin from SUPER_ADMIN_* in .env

    POST /api/v1/auth/register   public, creates a citizen
    POST /api/v1/auth/login      returns { user, token }
    GET  /api/v1/auth/me         needs "Authorization: Bearer <token>"
    POST /api/v1/auth/staff      super admin only, creates any staff role

Protect any future route:

    router.get("/x", authenticate, authorize("district_officer", "government_officer"), handler);

## Geography

    GET /api/v1/states                          all states
    GET /api/v1/states/:stateId/districts        districts in a state
    GET /api/v1/districts/:districtId/villages    villages in a district

All public (no auth) for now — add `authenticate` in geography.routes.ts if that changes.
Each level stores name, coordinates (`centroid` for State/District, `location` for Village — GeoJSON, [lng, lat]) and `population`.

## Incidents

Types: `flood, landslide, road_blockage, bridge_damage, heavy_rainfall, accident`
Statuses: `reported -> verified -> resolved` (or `rejected`)

    GET   /api/v1/incidents                 list, public. Query filters: district, state, status, type, severity
    GET   /api/v1/incidents/:id              single incident, public
    POST  /api/v1/incidents                  create, any logged-in user
    PATCH /api/v1/incidents/:id              update, owner or district/government officer
    PATCH /api/v1/incidents/:id/verify       district/government officer only
    PATCH /api/v1/incidents/:id/close        district/government officer only
    POST  /api/v1/incidents/:id/images       upload images, owner or moderator
                                              multipart/form-data, field name "images", up to 5 files, 5MB each

Create body: `{ title, description?, type, severity?, district, village?, latitude, longitude }`.
`state` is not sent by the client — it's derived from `district` so it can never be out of sync.
Coordinates are stored as a GeoJSON `location` field internally (`[longitude, latitude]`), built from
the `latitude`/`longitude` you send.

Add to `.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (from your Cloudinary dashboard).

## Real-time Alerts (Socket.io)

Alert levels: `low, medium, high, critical` (the existing `severity` field).

    GET   /api/v1/alerts                     Alert History, public. Filters: district, severity, status, hazardType, limit, skip
    GET   /api/v1/alerts/:id                  single alert, public
    POST  /api/v1/alerts                      Create Alert, district/government officer only - saves it, does not push it yet
    POST  /api/v1/alerts/:id/broadcast        Broadcast Alert, district/government officer only - pushes it over Socket.io (can resend)
    PATCH /api/v1/alerts/:id/resolve          district/government officer only - marks resolved, pushes "alert:updated"

Create body: `{ title, message, severity, hazardType?, district, expiresAt? }` (`level` is accepted as an alias for `severity`).

### Client side (Socket.io)

    import { io } from "socket.io-client";
    const socket = io("http://localhost:5000");

    socket.emit("join:district", districtId);   // optional: only get that district's alerts
    socket.on("alert:new", (alert) => { ... });
    socket.on("alert:updated", (alert) => { ... }); // resolved/expired

Every broadcast is sent to the district's room AND to all connected clients, so a client
that never joins a room still receives every alert - joining a district is just a filter.

## Accessibility Risk Engine

Score 0-100, category `low | moderate | high | critical` (thresholds: <25 low, <50 moderate, <75 high, >=75 critical).

Inputs:
- **incidentCount** / **incidentSeverityScore** - read automatically from the Incident collection
  (recent, non-rejected incidents in the district, default last 7 days; `hazardType` narrows which
  incident types count, e.g. `flood` only counts flood/heavy_rainfall incidents)
- **weatherSeverityScore** (0-100) and **routeConditionScore** (0-100, higher = worse road condition)
  - supplied by the caller, since this prototype has no live weather/traffic feed

Weights: incident volume 25%, incident severity 30%, weather 25%, route condition 20% (see `riskEngine.ts`).

Explanation text is generated locally by a rule-based template (`riskExplanation.ts`) - no external
AI API or key needed. It looks at the biggest contributing factors and the change from the last
score for that district, e.g. *"Tawang risk increased to high (score 78/100) due to heavy rainfall
and multiple road blockage reports."*

    POST /api/v1/risk-scores/calculate         district/government officer only
                                                body: { district, hazardType?, weatherSeverityScore, routeConditionScore, lookbackDays? }
    GET  /api/v1/risk-scores                   history, public. Filters: district, hazardType, category, limit, skip
    GET  /api/v1/risk-scores/latest/:districtId?hazardType=overall   most recent score for a district
    GET  /api/v1/risk-scores/:id

## Dashboard Analytics

All public, all read-only, all built as single MongoDB aggregation calls (mostly `$facet`, so each
endpoint scans its collection once instead of running several separate queries).

    GET /api/v1/dashboard/active-incidents
        ?district=&state=
        -> totalCount, bySeverity, byType, byDistrict (top 10), recent (last 10)

    GET /api/v1/dashboard/incident-trends
        ?district=&state=&days=30
        -> daily totals + severity breakdown, oldest to newest

    GET /api/v1/dashboard/district-risk-scores
        ?district=&state=&hazardType=overall
        -> latest RiskScore per district, sorted highest risk first
           (uses sort + $group + $first, the standard "latest per group" pattern,
            backed by the {district, hazardType, computedAt} index)

    GET /api/v1/dashboard/alert-statistics
        ?district=&state=&days=30
        -> totalCount, activeCount, bySeverity, byStatus, byHazardType, dailyTrend

`state` filters by looking up each document's district and matching its `state` field (Incident and
RiskScore already store `district`; Alert Statistics does one extra `$lookup` for this since Alert
only stores `district` directly).

## Disaster Simulation Engine

Scenario types: `flood, landslide, road_closure, bridge_failure`. Inputs: `district`, `severity`
(`low | medium | high | critical`) - the same levels used everywhere else in the API.

**Simulations never modify real data.** `simulation.service.ts` only ever reads `District` and
`Village`; the only write is a brand-new `Simulation` document. Running a simulation cannot change
a village's population, an incident, a risk score, or anything else already in the database - see
the comment at the top of `runSimulation()`.

    POST /api/v1/simulations/run          district/government officer only
                                           body: { district, scenarioType, severity, name? }
    GET  /api/v1/simulations              history, public. Filters: district, scenarioType, createdBy, limit, skip
    GET  /api/v1/simulations/:id

Output, all stored on the Simulation document:
- **Affected Villages** - `impacts[]`, one entry per village in the district (name, impact level, estimated affected population, whether road access is projected to be lost)
- **Population Impact** - `summary.totalPopulationImpact` and `summary.populationImpactPercent` (share of the district's total population)
- **Accessibility Impact** - `summary.villagesLosingRoadAccess` and `summary.accessibilityImpactPercent`
- **Emergency Recommendations** - `recommendations[]`, a short rule-based checklist (no external AI call, so it's deterministic and works offline) tailored to the scenario type and severity

The estimate is a simple, transparent model for demo purposes: each severity level maps to a
fixed affected-population fraction (10/30/60/90%), and road access is assumed lost for
road_closure/bridge_failure at medium+ severity, or flood/landslide at high+ severity. See
`simulationEngine.ts` if you want to tune these.

## AI Logistics Copilot (Gemini API)

    POST /api/v1/copilot/ask     any logged-in user
                                  body: { question: "..." }   (5-500 characters)

Answers questions like:
- "Which district has the highest risk?"
- "Suggest the safest route."
- "Which villages may become isolated?"
- "What happens if a flood occurs in Assam?"

### How it works

1. `copilot.context.ts` gathers a fresh, summarized snapshot of live data: all states/districts,
   the Active Incidents summary and District Risk Scores (reusing the Dashboard module's own
   aggregations - no duplicate queries), the last 20 active alerts, and villages currently without
   road access.
2. `copilot.gemini.ts` sends that context plus the question to Gemini, with a system instruction
   telling it to answer **only** from the supplied context and to say so plainly if the context
   isn't enough (rather than guessing).
3. Gemini is asked for `responseMimeType: "application/json"` with a `responseSchema`, so the
   response is structured JSON, not free text - it's parsed and shape-checked before being returned.
4. This is read-only end to end: the Copilot never writes to the database.

Response shape:

    {
      "answer": "...",
      "confidence": "low" | "medium" | "high",
      "relevantDistricts": ["..."],
      "relevantVillages": ["..."],
      "recommendedActions": ["..."],
      "dataSources": ["..."],
      "question": "...",
      "contextSummary": { "generatedAt", "districtsConsidered", "activeIncidentsConsidered", "activeAlertsConsidered" }
    }

Add to `.env`: `GEMINI_API_KEY` (from https://aistudio.google.com/app/apikey). `GEMINI_MODEL`
defaults to `gemini-3.1-flash-lite`; Gemini model names are retired on a rolling schedule, so check
https://ai.google.dev/gemini-api/docs/models if requests start failing with a "model not found" error.

## Demo seed data

Populates all 8 North-Eastern states, 16 districts (2 per state), 32 villages, 4 demo user
accounts (one per role), 16 incidents, 8 alerts, and a risk score for every district - enough
to demo every module without doing anything by hand.

    npm run seed          upsert states/districts/villages/users; add incidents/alerts/risk
                           scores only if those collections are currently empty (safe to re-run)
    npm run seed:reset     wipe State/District/Village/Incident/Alert/RiskScore/Simulation and
                           reseed from scratch (user accounts are NOT deleted)

Demo login (same password for all four): **Samvahak@123**

    officer@samvahak.demo            government_officer
    district.officer@samvahak.demo   district_officer (Kamrup Metropolitan, Assam)
    reporter@samvahak.demo           field_reporter
    citizen@samvahak.demo            citizen

State and district names/coordinates are real (approximate, capital-area coordinates for demo
mapping purposes). Village names and all incident/alert text are fabricated for the
presentation - not verified real-world records. Risk scores are computed with the same
`riskEngine`/`riskExplanation` functions the live API uses, so the numbers and explanation text
are consistent with what `POST /risk-scores/calculate` would produce.

Run `npm run seed:admin` separately if you also want a real production-style super admin account
(that script is independent of this one).
