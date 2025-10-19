// scripts/fetch_strava.js
const fs = require("fs/promises");

const CID = process.env.STRAVA_CLIENT_ID;
const CSECRET = process.env.STRAVA_CLIENT_SECRET;
const RREF = process.env.STRAVA_REFRESH_TOKEN;

async function main() {
  if (!CID || !CSECRET || !RREF) {
    throw new Error("Missing STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_REFRESH_TOKEN");
  }

  // 1) Access-Token via Refresh-Token holen (form-encoded ist am zuverlässigsten)
  const form = new URLSearchParams({
    client_id: String(CID),
    client_secret: CSECRET,
    grant_type: "refresh_token",
    refresh_token: RREF
  });

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    throw new Error(`Token refresh failed: ${tokenRes.status} ${t}`);
  }
  const { access_token } = await tokenRes.json();

  // 2) Alle Aktivitäten bis Jahresanfang paginieren
  const yearStart = new Date(new Date().getFullYear(), 0, 1); // lokales 1. Jan.
  const perPage = 200; // Strava-Maximum
  let page = 1;
  const all = [];

  while (true) {
    const url = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Activities fetch failed (page ${page}): ${res.status} ${t}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch);

    // Abbruch, sobald die ältesten Einträge dieser Seite vor dem Jahresbeginn liegen
    const last = batch[batch.length - 1];
    const lastDate = new Date(last.start_date_local);
    if (lastDate < yearStart) break;

    page++;
    // Sicherheitsbremse, falls etwas schief läuft
    if (page > 50) break;
  }

  // 3) Nur Läufe des laufenden Jahres mappen (mit Sekunden für Pace/Dauer)
  const runs = all
    .filter(a => a.type === "Run" && new Date(a.start_date_local) >= yearStart)
    .map(a => {
      const distanceKm = a.distance / 1000;
      const movingSec = a.moving_time; // Sekunden
      const paceSecPerKm = distanceKm > 0 ? Math.round(movingSec / distanceKm) : null;

      return {
        id: a.id,
        name: a.name,
        date: a.start_date_local,
        distance_km: +distanceKm.toFixed(2),
        moving_time_s: movingSec,
        pace_sec_per_km: paceSecPerKm,
        elevation_gain_m: a.total_elevation_gain
      };
    });

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(
    "data/strava.json",
    JSON.stringify({ updatedAt: new Date().toISOString(), runs }, null, 2),
    "utf-8"
  );

  console.log(`Fetched ${all.length} activities (all types), wrote ${runs.length} YTD runs to data/strava.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
