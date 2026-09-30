# Samvahak frontend

Map-first command center for North East India. Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, React Leaflet, Recharts.

Six views, switched from the top bar:

- **Corridors**: road and waterway corridors with status and incidents.
- **Risk**: accessibility risk intelligence for districts (score, category, trend, main factor, insights, heatmap, 24/48/72 hour prediction).
- **Isolation**: village isolation prediction. Pick a road, simulate a blockage, see which villages are cut off or at risk.
- **Supply**: essential goods impact prediction (medicines, food, LPG, fuel, relief supplies). Pick a supply route, simulate a failure, see delayed shipments, stock timelines and alternatives.
- **Co-Pilot**: a query console for officers. Ask in plain language (typed or spoken) and get an assessment, recommendation cards, alternative transport and the context used.
- **Disaster**: disaster simulation engine. Choose state, district, disaster type and severity, then replay the impact at 0, 6, 12, 24 and 48 hours.

## Run it

You need Node.js 18.17 or newer (check with `node -v`).

```
cd samvahak-frontend
npm install
npm run dev
```

Open http://localhost:3000

To check the production build:

```
npm run build
```

## How the risk score works

Each district gets four factor scores from 0 to 100. The score is a weighted sum:

| Factor | Weight |
| --- | --- |
| Weather severity | 35% |
| Road incidents | 25% |
| Route congestion | 20% |
| Historical disruption | 20% |

Categories: Low 0-30, Moderate 31-60, High 61-80, Critical 81-100.

Trend compares the score with 24 hours earlier. Predictions for 24, 48 and 72 hours project weather from a state-level outlook, let incidents and congestion react to it, and add an uncertainty band that widens with time.

## How the isolation simulation works

- The road network is built from the road corridors: each stretch between two hubs is one road (18 roads). Hospitals and supply depots sit at hubs.
- Each village sits on one road and may have a link road to a hub. Its nearest hospital and supply depot are worked out over the network (shortest path).
- A blockage covers a stretch of one road (position and length are adjustable). Villages outside the stretch can still reach the nearer end of the road. Villages inside it lose that road.
- Per village: **Isolated** means no route to any hospital. **At risk** means the hospital or depot trip grows by 20 km or more (or 40% and at least 5 km), or a depot is unreachable. **Connected** means the village depends on the road but still gets through with a small detour.
- Medical access risk: Critical if 8,000 or more people are isolated, High if 2,000 or more are isolated (or 10,000 or more are isolated or delayed), Moderate if anyone is isolated or 1,500 or more are delayed, otherwise Low. Thresholds are in `lib/isolation/simulate.ts`.
- Route B is the shortest path between the two ends of the blocked road that avoids it.
- Recommendations are template text over these numbers (`lib/isolation/recommend.ts`).

Village names, populations, link roads and positions are placeholder sample data. Replace `lib/isolation/seeds.ts` with the Census village directory and surveyed road links. Village markers are drawn beside their road, not at surveyed coordinates.

## How the essential goods prediction works

- **Route mapping:** 15 depots each have people served and days of cover for five goods. Each good has source hubs (for example Guwahati and Siliguri for medicines). Every depot is fed from its nearest source by road, and the roads on that path are the depot's supply route. The map colours and thickens roads by how many depots they feed for the selected good.
- **Failure:** the selected road is closed for a chosen number of hours. Depots fed over that road stop receiving normal shipments.
- **Alternatives:** the engine looks for a rerouted supply from any source (carries about 70% of normal volume) and a transfer from a nearby depot with spare stock (about 40%). The faster one is used in the estimate. If neither exists, stock only depletes.
- **Stock:** stock falls by daily use minus whatever arrives. After the road reopens and the normal trip time passes, deliveries run at 150% until stock is back to normal.
- **Risk per depot and good:** Critical if stock runs out within 72 hours, High if it falls below the safe level within 48 hours, Medium within 96 hours, otherwise Low. A good's risk is its worst depot.
- **Delayed shipments:** consignments due while the road is closed (up to 72 hours) at each affected depot.
- Assumptions (speed, capacity shares, safe levels, thresholds) are constants at the top of `lib/supply/model.ts` and `lib/supply/goods.ts`. People served, stock cover and consumption rates are placeholder sample data in `lib/supply/depots.ts`.

## How the disaster simulation works

- **Scenario:** flood, landslide, bridge collapse, road blockage or extreme rainfall, at severity 1 to 4. Landslide, bridge collapse and road blockage are placed on the modelled road nearest the chosen district. Flood and extreme rainfall are centred on the district.
- **Hazard zone:** a circle that grows from an initial share of its final radius at 0 hours to the full radius at 48 hours. Radii per type and severity are in `lib/disaster/meta.ts`.
- **Roads:** inside the inner part of the zone a road is blocked over the stretch the zone covers. In the rest of the zone it is degraded (slower, cost multiplied by 1.3 to 2.2 by severity). Floods only block low-lying roads (they slow hill roads). Extreme rainfall only blocks hill roads (triggered slides) and slows the rest.
- **Impacts at each step** reuse the isolation and supply models with several roads closed at once: villages isolated or at risk (also at risk if inside the zone), population affected, medical access risk, supply lines that use a blocked or degraded road, and district accessibility risk scores raised near the zone and near damaged roads.
- **Alerts and decisions:** alerts are raised when something new happens between steps (road blocked, villages isolated, medical risk up, supply disrupted, district risk higher). Decisions are template text over the numbers, ordered by urgency.
- Only 18 modelled roads and 63 sample villages exist, so a scenario far from them shows little impact. That is a limit of the sample data, not of the engine.

## How the co-pilot works

- **No model, no network.** The co-pilot runs in the browser. It reads the question, works out what is being asked, and answers from the platform's own modules. It is a rule-based engine over sample data, not a language model. `ask()` in `lib/copilot/engine.ts` is the single place to put a model or a backend call.
- **Understanding:** keyword scoring picks one of six question types (route, district vulnerability, supply risk, road status, village isolation, situation briefing). Place names are matched against hubs, districts and states, with tolerance for small spelling mistakes. Goods, a region, a time ("tomorrow", "in 48 hours") and "top 5" are picked up too.
- **Context feeds:** weather (district weather severity and the state outlook), route status (corridor status and advisories), incident reports, and risk scores. The panel shows which feeds each answer used.
- **Routes:** every road segment gets a risk score from corridor status, incidents, nearby district scores and weather. The safest route minimises length weighted by that risk and avoids roads that are disrupted right now if a detour exists. Places that are not on the modelled road network (for example Tawang) connect through the nearest hub, and the last leg is estimated.
- **Supply:** disrupted roads are closed for 72 hours in the supply model. A stress test then closes each feeding road alone and suggests stock top-ups so every depot survives a 72-hour closure.
- **Confidence:** each card starts from a value for its kind of answer and is reduced for estimated legs, assumed starting points, spelling matches, forecasts and sample data. The "What this rests on" line lists the adjustments.
- **Voice input:** uses the browser's built-in speech recognition (Chrome, Edge, Safari). It needs a secure page (https or localhost) and microphone permission. The browser may send audio to its speech provider. The mic button is disabled where the browser has no speech recognition.

## Where things live

- `lib/copilot/` parser, place matching, planner, answers, confidence, voice hook
- `components/copilot/` console, briefing, recommendation cards, feeds bar, map layer

- `lib/disaster/` scenario engine, decisions, replay state hook
- `components/disaster/` controls, timeline, incident panel, alert banner, map layer

- `lib/supply/` goods, depots, supply lines, failure analysis, recommendations
- `components/supply/` route list, risk dashboard panel, timeline chart, map layer

- `lib/isolation/` network, village database, simulation engine, recommendations
- `components/isolation/` road list, impact panel, map layer, legend

- `lib/risk/model.ts` weights, categories, colour scale (the scoring rules)
- `lib/risk/districts.ts` sample district inputs and state weather outlook (replace with backend data)
- `lib/risk/engine.ts` builds scores, trends and forecasts from those inputs
- `lib/risk/insights.ts` turns the numbers into plain-language sentences
- `components/risk/` risk panels, chart, heatmap layer
- `lib/data.ts` sample corridors, hubs and incidents
- `tailwind.config.js` forest, river and sand colour tokens

## Connecting the backend later

`buildDistrictRisks(inputs)` in `lib/risk/engine.ts` accepts any list of `DistrictInput` rows, so a fetch from the FastAPI backend only needs to return that shape.

## Before launch

- Connect a custom domain
- Favicon is at `public/favicon.svg`
- Base map tiles come from OpenStreetMap and CARTO, keep the attribution
