/**
 * Demo data seed script for SAMVAHAK (SIH 2026, team ByteMe).
 *
 * Geography (states/districts/villages) and demo users are UPSERTED, so this is safe to run
 * more than once. Event data (incidents/alerts/risk scores) is only inserted if those
 * collections are currently empty, to avoid piling up duplicates on repeat runs.
 *
 * Village names, incident reports and alert text below are FABRICATED for demo purposes -
 * not verified real-world records. State/district names and approximate coordinates are real.
 *
 * Usage:
 *   npm run seed          upsert geography + users, add events only if collections are empty
 *   npm run seed:reset     wipe State/District/Village/Incident/Alert/RiskScore/Simulation
 *                          (users are NOT touched) and reseed from scratch
 */
import { connectDB, disconnectDB } from "../config/db";
import { HazardType, IncidentType, Severity, UserRole } from "../constants/enums";
import { hashPassword } from "../modules/auth/auth.service";
import { Alert } from "../modules/alert/alert.model";
import { District } from "../modules/district/district.model";
import { Incident } from "../modules/incident/incident.model";
import { calculateRiskScore } from "../modules/risk-score/riskEngine";
import { generateExplanation } from "../modules/risk-score/riskExplanation";
import { IRiskInputs, RiskScore } from "../modules/risk-score/riskScore.model";
import { Simulation } from "../modules/simulation/simulation.model";
import { State } from "../modules/state/state.model";
import { User } from "../modules/user/user.model";
import { Village } from "../modules/village/village.model";

const RESET = process.argv.includes("--reset");
const DEMO_PASSWORD = "Samvahak@123";

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// ---------------------------------------------------------------------------
// 1. States - all 8 North-Eastern states, approximate capital-area coordinates
// ---------------------------------------------------------------------------
interface StateSeed {
  name: string;
  code: string;
  coordinates: [number, number];
  population: number;
}

const STATES: StateSeed[] = [
  { name: "Assam", code: "AS", coordinates: [91.75, 26.15], population: 31_200_000 },
  { name: "Arunachal Pradesh", code: "AR", coordinates: [93.62, 27.1], population: 1_570_000 },
  { name: "Manipur", code: "MN", coordinates: [93.94, 24.82], population: 3_280_000 },
  { name: "Meghalaya", code: "ML", coordinates: [91.89, 25.58], population: 3_370_000 },
  { name: "Mizoram", code: "MZ", coordinates: [92.72, 23.73], population: 1_100_000 },
  { name: "Nagaland", code: "NL", coordinates: [94.11, 25.67], population: 2_000_000 },
  { name: "Sikkim", code: "SK", coordinates: [88.61, 27.33], population: 690_000 },
  { name: "Tripura", code: "TR", coordinates: [91.28, 23.83], population: 4_170_000 },
];

// ---------------------------------------------------------------------------
// 2. Districts - two real districts per state
// ---------------------------------------------------------------------------
interface DistrictSeed {
  state: string;
  name: string;
  coordinates: [number, number];
  population: number;
}

const DISTRICTS: DistrictSeed[] = [
  { state: "AS", name: "Kamrup Metropolitan", coordinates: [91.75, 26.15], population: 1_260_000 },
  { state: "AS", name: "Cachar", coordinates: [92.8, 24.83], population: 1_740_000 },
  { state: "AR", name: "Tawang", coordinates: [91.86, 27.59], population: 50_000 },
  { state: "AR", name: "Papum Pare", coordinates: [93.62, 27.1], population: 176_000 },
  { state: "MN", name: "Imphal West", coordinates: [93.94, 24.82], population: 518_000 },
  { state: "MN", name: "Churachandpur", coordinates: [93.68, 24.34], population: 275_000 },
  { state: "ML", name: "East Khasi Hills", coordinates: [91.89, 25.58], population: 825_000 },
  { state: "ML", name: "West Garo Hills", coordinates: [90.22, 25.51], population: 643_000 },
  { state: "MZ", name: "Aizawl", coordinates: [92.72, 23.73], population: 400_000 },
  { state: "MZ", name: "Lunglei", coordinates: [92.73, 22.88], population: 161_000 },
  { state: "NL", name: "Kohima", coordinates: [94.11, 25.67], population: 270_000 },
  { state: "NL", name: "Dimapur", coordinates: [93.73, 25.9], population: 380_000 },
  { state: "SK", name: "East Sikkim", coordinates: [88.61, 27.33], population: 283_000 },
  { state: "SK", name: "West Sikkim", coordinates: [88.26, 27.28], population: 136_000 },
  { state: "TR", name: "West Tripura", coordinates: [91.28, 23.83], population: 1_725_000 },
  { state: "TR", name: "Dhalai", coordinates: [91.86, 23.85], population: 378_000 },
];

// ---------------------------------------------------------------------------
// 3. Villages - two sample villages per district (fabricated for the demo)
// ---------------------------------------------------------------------------
interface VillageSeed {
  district: string;
  name: string;
  offset: [number, number]; // added to district coordinates
  population: number;
  elevationM: number;
  hasRoadAccess: boolean;
  nearestHealthFacilityKm: number;
}

const VILLAGES: VillageSeed[] = [
  { district: "Kamrup Metropolitan", name: "Rani Char", offset: [0.15, -0.1], population: 3200, elevationM: 55, hasRoadAccess: true, nearestHealthFacilityKm: 6 },
  { district: "Kamrup Metropolitan", name: "Sonapur Basti", offset: [-0.2, 0.12], population: 2100, elevationM: 48, hasRoadAccess: true, nearestHealthFacilityKm: 9 },
  { district: "Cachar", name: "Lakhipur Gaon", offset: [0.18, 0.08], population: 4100, elevationM: 32, hasRoadAccess: true, nearestHealthFacilityKm: 12 },
  { district: "Cachar", name: "Sonai Tila", offset: [-0.15, -0.14], population: 1800, elevationM: 28, hasRoadAccess: false, nearestHealthFacilityKm: 22 },
  { district: "Tawang", name: "Jang", offset: [0.1, 0.06], population: 950, elevationM: 2700, hasRoadAccess: true, nearestHealthFacilityKm: 18 },
  { district: "Tawang", name: "Lumla", offset: [-0.12, -0.09], population: 620, elevationM: 2450, hasRoadAccess: false, nearestHealthFacilityKm: 35 },
  { district: "Papum Pare", name: "Sagalee", offset: [0.14, 0.1], population: 1400, elevationM: 950, hasRoadAccess: true, nearestHealthFacilityKm: 15 },
  { district: "Papum Pare", name: "Doimukh", offset: [-0.1, -0.07], population: 2600, elevationM: 320, hasRoadAccess: true, nearestHealthFacilityKm: 8 },
  { district: "Imphal West", name: "Lamphelpat", offset: [0.09, 0.05], population: 3400, elevationM: 780, hasRoadAccess: true, nearestHealthFacilityKm: 5 },
  { district: "Imphal West", name: "Patsoi", offset: [-0.11, -0.06], population: 1900, elevationM: 800, hasRoadAccess: true, nearestHealthFacilityKm: 7 },
  { district: "Churachandpur", name: "Tuibong", offset: [0.13, 0.07], population: 1500, elevationM: 1000, hasRoadAccess: false, nearestHealthFacilityKm: 28 },
  { district: "Churachandpur", name: "Singngat", offset: [-0.16, -0.1], population: 800, elevationM: 1200, hasRoadAccess: false, nearestHealthFacilityKm: 40 },
  { district: "East Khasi Hills", name: "Mawlai", offset: [0.08, -0.05], population: 5200, elevationM: 1490, hasRoadAccess: true, nearestHealthFacilityKm: 4 },
  { district: "East Khasi Hills", name: "Sohra Village", offset: [-0.2, -0.35], population: 1300, elevationM: 1430, hasRoadAccess: true, nearestHealthFacilityKm: 20 },
  { district: "West Garo Hills", name: "Rongram", offset: [0.12, 0.09], population: 1700, elevationM: 60, hasRoadAccess: true, nearestHealthFacilityKm: 14 },
  { district: "West Garo Hills", name: "Selsella", offset: [-0.14, -0.08], population: 1100, elevationM: 90, hasRoadAccess: false, nearestHealthFacilityKm: 30 },
  { district: "Aizawl", name: "Sairang", offset: [0.1, 0.07], population: 2400, elevationM: 950, hasRoadAccess: true, nearestHealthFacilityKm: 10 },
  { district: "Aizawl", name: "Sialsuk", offset: [-0.13, -0.09], population: 900, elevationM: 1050, hasRoadAccess: false, nearestHealthFacilityKm: 25 },
  { district: "Lunglei", name: "Lungsen", offset: [0.11, 0.06], population: 1200, elevationM: 700, hasRoadAccess: true, nearestHealthFacilityKm: 16 },
  { district: "Lunglei", name: "Hnahthial", offset: [-0.15, -0.11], population: 850, elevationM: 850, hasRoadAccess: false, nearestHealthFacilityKm: 32 },
  { district: "Kohima", name: "Kigwema", offset: [0.09, -0.08], population: 1600, elevationM: 1650, hasRoadAccess: true, nearestHealthFacilityKm: 11 },
  { district: "Kohima", name: "Jakhama", offset: [-0.1, 0.07], population: 1100, elevationM: 1550, hasRoadAccess: false, nearestHealthFacilityKm: 24 },
  { district: "Dimapur", name: "Chumukedima", offset: [0.1, 0.06], population: 3900, elevationM: 260, hasRoadAccess: true, nearestHealthFacilityKm: 6 },
  { district: "Dimapur", name: "Medziphema", offset: [-0.12, -0.07], population: 1500, elevationM: 300, hasRoadAccess: true, nearestHealthFacilityKm: 13 },
  { district: "East Sikkim", name: "Rongli", offset: [0.13, -0.06], population: 1300, elevationM: 1500, hasRoadAccess: true, nearestHealthFacilityKm: 17 },
  { district: "East Sikkim", name: "Rhenock", offset: [-0.09, 0.08], population: 2000, elevationM: 900, hasRoadAccess: true, nearestHealthFacilityKm: 10 },
  { district: "West Sikkim", name: "Yuksom", offset: [0.11, 0.09], population: 700, elevationM: 1780, hasRoadAccess: false, nearestHealthFacilityKm: 38 },
  { district: "West Sikkim", name: "Pelling", offset: [-0.1, -0.07], population: 950, elevationM: 2150, hasRoadAccess: true, nearestHealthFacilityKm: 21 },
  { district: "West Tripura", name: "Jirania", offset: [0.09, 0.05], population: 2800, elevationM: 25, hasRoadAccess: true, nearestHealthFacilityKm: 7 },
  { district: "West Tripura", name: "Mohanpur", offset: [-0.11, -0.06], population: 2100, elevationM: 30, hasRoadAccess: true, nearestHealthFacilityKm: 9 },
  { district: "Dhalai", name: "Ambassa", offset: [0.1, 0.07], population: 1400, elevationM: 45, hasRoadAccess: true, nearestHealthFacilityKm: 15 },
  { district: "Dhalai", name: "Gandacherra", offset: [-0.13, -0.08], population: 750, elevationM: 60, hasRoadAccess: false, nearestHealthFacilityKm: 33 },
];

// ---------------------------------------------------------------------------
// 4. Demo users - one of each staff role, plus a citizen. Not the production super admin
//    (that's `npm run seed:admin`) - these are separate, clearly-labeled demo accounts.
// ---------------------------------------------------------------------------
const DEMO_USERS: { name: string; email: string; role: UserRole; district?: string }[] = [
  { name: "Demo Government Officer", email: "officer@samvahak.demo", role: "government_officer" },
  { name: "Demo District Officer (Kamrup Metropolitan)", email: "district.officer@samvahak.demo", role: "district_officer", district: "Kamrup Metropolitan" },
  { name: "Demo Field Reporter", email: "reporter@samvahak.demo", role: "field_reporter" },
  { name: "Demo Citizen", email: "citizen@samvahak.demo", role: "citizen" },
];

// ---------------------------------------------------------------------------
// 5. Incidents - fabricated demo reports across several districts/villages
// ---------------------------------------------------------------------------
interface IncidentSeed {
  district: string;
  village?: string;
  type: IncidentType;
  severity: Severity;
  status: "reported" | "verified" | "in_progress" | "resolved" | "rejected";
  title: string;
  description: string;
  daysAgo: number;
  reporter: "reporter" | "citizen";
}

const INCIDENTS: IncidentSeed[] = [
  { district: "Tawang", village: "Lumla", type: "landslide", severity: "critical", status: "verified", title: "Major landslide blocks Lumla approach road", description: "Heavy overnight rainfall triggered a landslide covering roughly 40m of the approach road; no vehicle movement possible.", daysAgo: 1, reporter: "reporter" },
  { district: "Tawang", village: "Jang", type: "heavy_rainfall", severity: "high", status: "verified", title: "Continuous heavy rainfall over Jang circle", description: "Rainfall has continued for over 30 hours; local streams are near their banks.", daysAgo: 1, reporter: "reporter" },
  { district: "Tawang", type: "road_blockage", severity: "high", status: "reported", title: "Debris blocking NH-13 near Tawang town", description: "Rockfall debris reported partially blocking the highway; single-lane traffic only.", daysAgo: 2, reporter: "citizen" },
  { district: "Cachar", village: "Sonai Tila", type: "flood", severity: "critical", status: "verified", title: "Barak river overflow near Sonai Tila", description: "River water has entered the lower part of the village; several homes reportedly waterlogged.", daysAgo: 2, reporter: "reporter" },
  { district: "Cachar", village: "Lakhipur Gaon", type: "flood", severity: "medium", status: "in_progress", title: "Waterlogging on approach road to Lakhipur Gaon", description: "Approach road partially submerged after continuous rain; passable only by tractor.", daysAgo: 3, reporter: "citizen" },
  { district: "Churachandpur", village: "Singngat", type: "landslide", severity: "high", status: "reported", title: "Slope movement observed above Singngat", description: "Local residents report cracks and minor slippage on the slope above the settlement.", daysAgo: 1, reporter: "citizen" },
  { district: "Churachandpur", village: "Tuibong", type: "bridge_damage", severity: "critical", status: "verified", title: "Approach span of Tuibong bridge washed out", description: "The bridge connecting Tuibong to the main road has a washed-out approach span; foot traffic only.", daysAgo: 4, reporter: "reporter" },
  { district: "East Khasi Hills", village: "Sohra Village", type: "heavy_rainfall", severity: "medium", status: "resolved", title: "Heavy rain warning for Sohra (Cherrapunji) area", description: "Unusually intense rainfall recorded; no damage reported after the event passed.", daysAgo: 6, reporter: "reporter" },
  { district: "West Garo Hills", village: "Selsella", type: "road_blockage", severity: "high", status: "verified", title: "Uprooted trees block Selsella connector road", description: "Strong winds brought down several trees across the only connector road to Selsella.", daysAgo: 2, reporter: "citizen" },
  { district: "Aizawl", village: "Sialsuk", type: "landslide", severity: "medium", status: "reported", title: "Minor slide reported near Sialsuk", description: "A small slide has narrowed the carriageway; passable with caution.", daysAgo: 1, reporter: "citizen" },
  { district: "Lunglei", village: "Hnahthial", type: "road_blockage", severity: "medium", status: "resolved", title: "Temporary blockage near Hnahthial cleared", description: "Debris from a minor slide was cleared by the PWD within a day.", daysAgo: 8, reporter: "reporter" },
  { district: "Kohima", village: "Jakhama", type: "landslide", severity: "high", status: "verified", title: "Slide affects Jakhama-Kohima stretch", description: "Slide has narrowed the road to a single lane; traffic police deployed for regulation.", daysAgo: 3, reporter: "reporter" },
  { district: "Dimapur", type: "accident", severity: "medium", status: "resolved", title: "Multi-vehicle accident on NH-29 near Dimapur", description: "Accident involving two trucks and a passenger vehicle; road cleared within hours.", daysAgo: 5, reporter: "citizen" },
  { district: "East Sikkim", village: "Rongli", type: "landslide", severity: "high", status: "verified", title: "Slide near Rongli affects border road", description: "A moderate slide has affected the road connecting Rongli to the border areas.", daysAgo: 2, reporter: "reporter" },
  { district: "West Sikkim", village: "Yuksom", type: "road_blockage", severity: "critical", status: "verified", title: "Yuksom cut off after slide at approach road", description: "The only motorable approach to Yuksom is blocked; the village is currently reachable only on foot.", daysAgo: 1, reporter: "reporter" },
  { district: "Dhalai", village: "Gandacherra", type: "flood", severity: "medium", status: "reported", title: "Gumti river rising near Gandacherra", description: "Water level rising steadily; low-lying fields already affected.", daysAgo: 1, reporter: "citizen" },
];

// ---------------------------------------------------------------------------
// 6. Alerts - a mix of active and resolved, issued for districts with the worst incidents
// ---------------------------------------------------------------------------
interface AlertSeed {
  district: string;
  title: string;
  message: string;
  severity: Severity;
  hazardType: HazardType;
  status: "active" | "resolved" | "expired";
  daysAgo: number;
  expiresInDays?: number;
}

const ALERTS: AlertSeed[] = [
  { district: "Tawang", title: "Landslide warning: Lumla-Tawang stretch", message: "Heavy rainfall has triggered landslides on the Lumla approach road. Avoid non-essential travel; expect delays on NH-13.", severity: "critical", hazardType: "landslide", status: "active", daysAgo: 1, expiresInDays: 2 },
  { district: "Cachar", title: "Flood advisory: Barak river catchment", message: "River levels are rising in the Barak catchment near Sonai Tila and Lakhipur. Residents in low-lying areas should move valuables to higher ground.", severity: "high", hazardType: "flood", status: "active", daysAgo: 2, expiresInDays: 3 },
  { district: "Churachandpur", title: "Bridge closure: Tuibong approach", message: "The approach span to Tuibong bridge has washed out. The bridge is closed to vehicles until further notice; use the Singngat diversion.", severity: "critical", hazardType: "road_disruption", status: "active", daysAgo: 4 },
  { district: "West Sikkim", title: "Yuksom access disruption", message: "The motorable approach to Yuksom is currently blocked. Essential supplies are being coordinated via alternate routes.", severity: "high", hazardType: "road_disruption", status: "active", daysAgo: 1, expiresInDays: 4 },
  { district: "West Garo Hills", title: "Road clearance in progress: Selsella", message: "Fallen trees on the Selsella connector road are being cleared. Expect a short delay before the road reopens.", severity: "medium", hazardType: "road_disruption", status: "active", daysAgo: 2, expiresInDays: 1 },
  { district: "East Khasi Hills", title: "Heavy rainfall alert lifted for Sohra", message: "The earlier heavy rainfall warning for the Sohra area has been lifted; conditions have returned to normal.", severity: "medium", hazardType: "flood", status: "resolved", daysAgo: 6 },
  { district: "Kohima", title: "Traffic advisory: Jakhama stretch", message: "A landslide has narrowed the Jakhama-Kohima road to one lane. Traffic police are regulating movement; expect delays.", severity: "medium", hazardType: "landslide", status: "active", daysAgo: 3, expiresInDays: 2 },
  { district: "Dhalai", title: "Watch: rising water levels near Gandacherra", message: "The Gumti river is rising near Gandacherra. Residents in low-lying fields should stay alert for further updates.", severity: "medium", hazardType: "flood", status: "active", daysAgo: 1, expiresInDays: 3 },
];

// ---------------------------------------------------------------------------
// 7. Risk score inputs per district - weather/route figures are set to tell a consistent
//    demo story (Tawang and West Sikkim worst-hit); incident count/severity come from the
//    INCIDENTS list above so the numbers line up with what's actually in the database.
// ---------------------------------------------------------------------------
const RISK_MANUAL_INPUTS: Record<string, { weatherSeverityScore: number; routeConditionScore: number }> = {
  "Kamrup Metropolitan": { weatherSeverityScore: 20, routeConditionScore: 10 },
  Cachar: { weatherSeverityScore: 75, routeConditionScore: 55 },
  Tawang: { weatherSeverityScore: 85, routeConditionScore: 70 },
  "Papum Pare": { weatherSeverityScore: 30, routeConditionScore: 15 },
  "Imphal West": { weatherSeverityScore: 25, routeConditionScore: 15 },
  Churachandpur: { weatherSeverityScore: 55, routeConditionScore: 65 },
  "East Khasi Hills": { weatherSeverityScore: 40, routeConditionScore: 20 },
  "West Garo Hills": { weatherSeverityScore: 45, routeConditionScore: 40 },
  Aizawl: { weatherSeverityScore: 35, routeConditionScore: 25 },
  Lunglei: { weatherSeverityScore: 30, routeConditionScore: 20 },
  Kohima: { weatherSeverityScore: 40, routeConditionScore: 45 },
  Dimapur: { weatherSeverityScore: 20, routeConditionScore: 15 },
  "East Sikkim": { weatherSeverityScore: 50, routeConditionScore: 45 },
  "West Sikkim": { weatherSeverityScore: 70, routeConditionScore: 80 },
  "West Tripura": { weatherSeverityScore: 20, routeConditionScore: 10 },
  Dhalai: { weatherSeverityScore: 55, routeConditionScore: 30 },
};

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 25, medium: 50, high: 75, critical: 100 };

async function seedStates() {
  const byCode = new Map<string, string>(); // code -> _id
  for (const s of STATES) {
    const doc = await State.findOneAndUpdate(
      { code: s.code },
      { name: s.name, code: s.code, centroid: { type: "Point", coordinates: s.coordinates }, population: s.population },
      { upsert: true, new: true }
    );
    byCode.set(s.code, doc._id.toString());
  }
  console.log(`States: ${byCode.size} upserted`);
  return byCode;
}

async function seedDistricts(stateByCode: Map<string, string>) {
  const byName = new Map<string, string>(); // district name -> _id (names are unique in this dataset)
  for (const d of DISTRICTS) {
    const stateId = stateByCode.get(d.state);
    if (!stateId) throw new Error(`Unknown state code in DISTRICTS: ${d.state}`);
    const doc = await District.findOneAndUpdate(
      { state: stateId, name: d.name },
      { name: d.name, state: stateId, centroid: { type: "Point", coordinates: d.coordinates }, population: d.population },
      { upsert: true, new: true }
    );
    byName.set(d.name, doc._id.toString());
  }
  console.log(`Districts: ${byName.size} upserted`);
  return byName;
}

async function seedVillages(districtByName: Map<string, string>) {
  const byKey = new Map<string, string>(); // "district|village" -> _id
  for (const v of VILLAGES) {
    const districtId = districtByName.get(v.district);
    if (!districtId) throw new Error(`Unknown district in VILLAGES: ${v.district}`);
    const districtSeed = DISTRICTS.find((d) => d.name === v.district)!;
    const coordinates: [number, number] = [
      districtSeed.coordinates[0] + v.offset[0],
      districtSeed.coordinates[1] + v.offset[1],
    ];
    const doc = await Village.findOneAndUpdate(
      { district: districtId, name: v.name },
      {
        name: v.name,
        district: districtId,
        location: { type: "Point", coordinates },
        population: v.population,
        elevationM: v.elevationM,
        hasRoadAccess: v.hasRoadAccess,
        nearestHealthFacilityKm: v.nearestHealthFacilityKm,
      },
      { upsert: true, new: true }
    );
    byKey.set(`${v.district}|${v.name}`, doc._id.toString());
  }
  console.log(`Villages: ${byKey.size} upserted`);
  return byKey;
}

async function seedUsers(districtByName: Map<string, string>) {
  const byEmail = new Map<string, { id: string; role: UserRole }>();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  for (const u of DEMO_USERS) {
    const district = u.district ? districtByName.get(u.district) : undefined;
    const doc = await User.findOneAndUpdate(
      { email: u.email },
      { name: u.name, email: u.email, passwordHash, role: u.role, district, isActive: true },
      { upsert: true, new: true }
    );
    byEmail.set(u.email, { id: doc._id.toString(), role: u.role });
  }
  console.log(`Demo users: ${byEmail.size} upserted (password for all: ${DEMO_PASSWORD})`);
  return byEmail;
}

async function seedIncidents(
  districtByName: Map<string, string>,
  villageByKey: Map<string, string>,
  districtStateByName: Map<string, string>,
  reporterId: string,
  citizenId: string
) {
  if (!RESET && (await Incident.countDocuments()) > 0) {
    console.log("Incidents: collection already has data, skipping (use --reset to reseed)");
    return;
  }

  const docs = INCIDENTS.map((i) => {
    const districtId = districtByName.get(i.district);
    if (!districtId) throw new Error(`Unknown district in INCIDENTS: ${i.district}`);
    const stateId = districtStateByName.get(i.district);
    const villageId = i.village ? villageByKey.get(`${i.district}|${i.village}`) : undefined;
    const districtSeed = DISTRICTS.find((d) => d.name === i.district)!;

    return {
      title: i.title,
      description: i.description,
      type: i.type,
      severity: i.severity,
      status: i.status,
      location: { type: "Point" as const, coordinates: districtSeed.coordinates },
      state: stateId,
      district: districtId,
      village: villageId,
      reportedBy: i.reporter === "reporter" ? reporterId : citizenId,
      createdAt: daysAgo(i.daysAgo),
      ...(i.status === "resolved" ? { resolvedAt: daysAgo(Math.max(i.daysAgo - 1, 0)) } : {}),
    };
  });

  await Incident.insertMany(docs);
  console.log(`Incidents: ${docs.length} inserted`);
}

async function seedAlerts(districtByName: Map<string, string>, issuedBy: string) {
  if (!RESET && (await Alert.countDocuments()) > 0) {
    console.log("Alerts: collection already has data, skipping (use --reset to reseed)");
    return;
  }

  const docs = ALERTS.map((a) => {
    const districtId = districtByName.get(a.district);
    if (!districtId) throw new Error(`Unknown district in ALERTS: ${a.district}`);
    return {
      district: districtId,
      title: a.title,
      message: a.message,
      severity: a.severity,
      hazardType: a.hazardType,
      status: a.status,
      issuedBy,
      startsAt: daysAgo(a.daysAgo),
      expiresAt: a.expiresInDays !== undefined ? new Date(Date.now() + a.expiresInDays * 24 * 60 * 60 * 1000) : undefined,
      broadcastCount: 1,
      lastBroadcastAt: daysAgo(a.daysAgo),
    };
  });

  await Alert.insertMany(docs);
  console.log(`Alerts: ${docs.length} inserted`);
}

async function seedRiskScores(districtByName: Map<string, string>) {
  if (!RESET && (await RiskScore.countDocuments()) > 0) {
    console.log("Risk scores: collection already has data, skipping (use --reset to reseed)");
    return;
  }

  const docs = [];
  for (const [districtName, districtId] of districtByName) {
    const manual = RISK_MANUAL_INPUTS[districtName];
    if (!manual) continue;

    const relevantIncidents = INCIDENTS.filter((i) => i.district === districtName);
    const incidentCount = relevantIncidents.length;
    const incidentSeverityScore = incidentCount
      ? Math.round(relevantIncidents.reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0) / incidentCount)
      : 0;

    const inputs: IRiskInputs = { incidentCount, incidentSeverityScore, ...manual };
    const { score, category } = calculateRiskScore(inputs);
    const explanation = generateExplanation(districtName, inputs, score, category);

    docs.push({
      district: districtId,
      hazardType: "overall" as HazardType,
      score,
      category,
      inputs,
      explanation,
      computedAt: daysAgo(0),
    });
  }

  await RiskScore.insertMany(docs);
  console.log(`Risk scores: ${docs.length} inserted`);
}

async function resetCollections() {
  console.log("--reset passed: clearing State, District, Village, Incident, Alert, RiskScore, Simulation (users kept)");
  await Promise.all([
    State.deleteMany({}),
    District.deleteMany({}),
    Village.deleteMany({}),
    Incident.deleteMany({}),
    Alert.deleteMany({}),
    RiskScore.deleteMany({}),
    Simulation.deleteMany({}),
  ]);
}

// This script does not create Simulation documents - those are hypothetical, generated on
// demand by POST /simulations/run, and shouldn't be pre-seeded as if they were real events.

async function main() {
  await connectDB();
  if (RESET) await resetCollections();

  const stateByCode = await seedStates();
  const districtByName = await seedDistricts(stateByCode);
  const villageByKey = await seedVillages(districtByName);
  const users = await seedUsers(districtByName);

  // district name -> its state's _id, for stamping Incident.state
  const districtStateByName = new Map<string, string>();
  for (const d of DISTRICTS) districtStateByName.set(d.name, stateByCode.get(d.state)!);

  const reporter = users.get("reporter@samvahak.demo")!;
  const citizen = users.get("citizen@samvahak.demo")!;
  const officer = users.get("officer@samvahak.demo")!;

  await seedIncidents(districtByName, villageByKey, districtStateByName, reporter.id, citizen.id);
  await seedAlerts(districtByName, officer.id);
  await seedRiskScores(districtByName);

  console.log("\nSeed complete.");
  console.log("Demo login (any of these emails), password:", DEMO_PASSWORD);
  for (const u of DEMO_USERS) console.log(`  - ${u.email}  (${u.role})`);

  await disconnectDB();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await disconnectDB();
  process.exit(1);
});
