document.getElementById("myButton").addEventListener("click", function () {
  alert("Hello World");
});

async function renderStravaRuns() {
  const container = document.getElementById('strava-container');

  try {
    // Strava-Daten abrufen
    const res = await fetch('data/strava.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { runs } = await res.json();

    if (!runs || runs.length === 0) {
      container.innerHTML = '<p>Keine Läufe gefunden.</p>';
      return;
    }

    // Nur die letzten 10 Läufe anzeigen
    const items = runs.slice(0, 10).map(run => {
      const date = new Date(run.date).toLocaleDateString('de-CH');
      const pace = run.pace_min_per_km
        ? `${run.pace_min_per_km} min/km`
        : '-';
      return `
        <div class="run">
          <h3>${run.name}</h3>
          <p><strong>${date}</strong></p>
          <p>${run.distance_km} km &middot; Pace ${pace}</p>
          <p>⛰ ${run.elevation_gain_m} m &middot; 🕒 ${run.moving_time_min} min</p>
        </div>
      `;
    }).join('');

    container.innerHTML = items;

  } catch (err) {
    console.error('Fehler beim Laden der Strava-Daten:', err);
    container.innerHTML = '<p>Fehler beim Laden der Strava-Daten.</p>';
  }
}

// Funktion beim Laden der Seite ausführen
document.addEventListener('DOMContentLoaded', renderStravaRuns);


// Läufe nur laden, wenn die Seite sport.html ist
if (window.location.pathname.includes('sport.html')) {
  document.addEventListener('DOMContentLoaded', renderStravaRuns);
}
