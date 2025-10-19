// ============================================
// Strava Daten laden und auf Sport-Seite anzeigen
// ============================================

async function renderStravaRuns() {
  const container = document.getElementById('strava-container');
  if (!container) return; // Wenn wir nicht auf sport.html sind, abbrechen

  try {
    // JSON-Datei mit Strava-Daten abrufen (vom GitHub Pages Pfad)
    const res = await fetch('/portfolio-page/data/strava.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    // JSON-Inhalt lesen
    const { runs } = await res.json();

    // Keine Läufe vorhanden?
    if (!runs || runs.length === 0) {
      container.innerHTML = '<p>Keine Läufe gefunden.</p>';
      return;
    }

    // Nur die letzten 10 Läufe anzeigen
    const items = runs.slice(0, 10).map(run => {
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

    // HTML einfügen
    container.innerHTML = items;

  } catch (err) {
    console.error('Fehler beim Laden der Strava-Daten:', err);
    container.innerHTML = '<p>Fehler beim Laden der Strava-Daten.</p>';
  }
}

// ============================================
// Nur auf der Sport-Seite aktivieren
// ============================================
if (location.pathname.endsWith('/sport.html') || location.pathname.endsWith('sport.html')) {
  document.addEventListener('DOMContentLoaded', renderStravaRuns);
}

