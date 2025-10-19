// ===============================
// Strava: Läufe auf sport.html laden
// ===============================

function onSportPage() {
  const p = location.pathname;
  return p.endsWith('/sport.html') || p.endsWith('sport.html');
}

async function fetchJsonWithFallback() {
  // 1) absoluter Pfad (GitHub Pages)
  const abs = '/portfolio-page/data/strava.json';
  try {
    const r = await fetch(abs, { cache: 'no-store' });
    if (r.ok) return r.json();
    console.warn('ABS fetch failed:', r.status, r.statusText);
  } catch (e) {
    console.warn('ABS fetch error:', e);
  }

  // 2) relativer Pfad (falls Seite in Unterordnern o. ä.)
  const rel = 'data/strava.json';
  const r2 = await fetch(rel, { cache: 'no-store' });
  if (!r2.ok) throw new Error(`Fetch failed: ${rel} → HTTP ${r2.status}`);
  return r2.json();
}

async function renderStravaRuns() {
  if (!onSportPage()) return; // nur auf sport.html
  const container = document.getElementById('strava-container');
  if (!container) return;

  try {
    console.log('[Strava] Lade Daten …');
    const { runs } = await fetchJsonWithFallback();

    if (!runs || runs.length === 0) {
      container.innerHTML = '<p>Keine Läufe gefunden.</p>';
      return;
    }

    const html = runs.slice(0, 10).map(run => {
      const date = new Date(run.date).toLocaleDateString('de-CH');
      const pace = run.pace_min_per_km ? `${run.pace_min_per_km} min/km` : '-';
      return `
        <div class="run">
          <h3>${run.name}</h3>
          <p><strong>${date}</strong></p>
          <p>${run.distance_km} km &middot; Pace ${pace}</p>
          <p>⛰ ${run.elevation_gain_m} m &middot; 🕒 ${run.moving_time_min} min</p>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    console.log('[Strava] OK – Läufe gerendert');
  } catch (err) {
    console.error('[Strava] Fehler:', err);
    container.innerHTML = '<p>Fehler beim Laden der Strava-Daten.</p>';
  }
}

// sofort starten, falls DOM schon bereit; sonst beim Event
if (onSportPage()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderStravaRuns);
  } else {
    renderStravaRuns();
  }
}
