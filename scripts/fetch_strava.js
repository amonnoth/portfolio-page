// scripts/fetch_strava.js
// Node 18+/20: fetch ist global verfügbar; CommonJS-Style für maximale Kompatibilität
const fs = require("fs/promises");

const CID = process.env.STRAVA_CLIENT_ID;
const CSECRET = process.env.STRAVA_CLIENT_SECRET;
const RREF = process.env.STRAVA_REFRESH_TOKEN;

async function main() {
  if (!CID || !CSECRET || !RREF) {
    throw new Error("Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_REFRESH_TOKEN");
  }

  // 1) Access Token via Refresh-Token holen
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CID,
      client_secret: CSECRET,
      grant_type: "refresh_token",
      refresh_token: RREF
    })
  });
  if (!tokenRes.ok) throw new Error(`Token refresh failed: ${tokenRes.status} ${await tokenRes.text()}`);
  const { access_token } = await tokenRes.json();

  // 2) Aktivitäten abrufen (z. B. 50 letzte)
  const actsRes = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=50", {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  if (!actsRes.ok) throw new Error(`Activities fetch failed: ${actsRes.status} ${await actsRes.text()}`);
  const acts = await actsRes.json();

  // 3) Nur Läufe mappen (leichtgewichtiges JSON)
  const runs = acts
    .filter(a => a.type === "Run")
    .map(a => ({
      id: a.id,
      name: a.name,
      date: a.start_date_local,                   // lokale Startzeit
      distance_km: +(a.distance / 1000).toFixed(2),
      moving_time_min: Math.round(a.moving_time / 60),
      pace_min_per_km: a.moving_time ? ((a.moving_time / 60) / (a.distance / 1000)).toFixed(2) : null,
      elevation_gain_m: a.total_elevation_gain
    }));

  // 4) JSON schreiben
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(
    "data/strava.json",
    JSON.stringify({ updatedAt: new Date().toISOString(), runs }, null, 2),
    "utf-8"
  );

  console.log(`Wrote ${runs.length} runs to data/strava.json`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
