// ============================================
// Hilfsfunktionen
// ============================================
function onSportPage() {
  const p = location.pathname;
  return p.endsWith('/sport.html') || p.endsWith('sport.html');
}

function pad(n){ return n.toString().padStart(2,'0'); }

function secondsToHMS(secs){
  if (secs == null || isNaN(secs)) return '–';
  const h = Math.floor(secs/3600);
  const m = Math.floor((secs%3600)/60);
  const s = Math.floor(secs%60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function secPerKmToPace(secPerKm){
  if (secPerKm == null || !isFinite(secPerKm) || secPerKm<=0) return '–';
  const m = Math.floor(secPerKm/60);
  const s = Math.round(secPerKm%60);
  return `${pad(m)}:${pad(s)} min/km`;
}

// Fallback: wenn JSON noch keine Sekunden enthält (alte Version)
function deriveSeconds(run){
  if (typeof run.moving_time_s === 'number') return run.moving_time_s;
  if (typeof run.moving_time_min === 'number') return run.moving_time_min * 60;
  return null;
}
function derivePaceSecPerKm(run){
  if (typeof run.pace_sec_per_km === 'number') return run.pace_sec_per_km;
  const secs = deriveSeconds(run);
  if (secs && run.distance_km > 0) return Math.round(secs / run.distance_km);
  return null;
}

// ============================================
// Rendering
// ============================================
async function fetchJsonWithFallback() {
  // 1) absolut (GitHub Pages)
  try{
    const r = await fetch('/portfolio-page/data/strava.json', { cache: 'no-store' });
    if (r.ok) return r.json();
  }catch{}
  // 2) relativ
  const r2 = await fetch('data/strava.json', { cache: 'no-store' });
  return r2.json();
}

function setText(id, text){ const el=document.getElementById(id); if (el) el.textContent=text; }

function renderYTD(runs, updatedAt){
  const year = new Date().getFullYear();
  const ytd = runs.filter(r => new Date(r.date).getFullYear() === year);

  const count = ytd.length;
  const dist = ytd.reduce((s,r)=> s + (r.distance_km||0), 0);
  const secs = ytd.reduce((s,r)=> s + (deriveSeconds(r) || 0), 0);
  const elev = ytd.reduce((s,r)=> s + (r.elevation_gain_m||0), 0);
  const longest = ytd.reduce((m,r)=> Math.max(m, r.distance_km||0), 0);

  // Durchschnittspace gewichtet nach Distanz
  const totalPaceSec = ytd.reduce((s,r)=>{
    const ps = derivePaceSecPerKm(r);
    return s + (ps && r.distance_km ? ps * r.distance_km : 0);
  },0);
  const avgPaceSec = dist > 0 ? Math.round(totalPaceSec / dist) : null;

  setText('ytd-count', count.toString());
  setText('ytd-distance', `${dist.toFixed(1)} km`);
  setText('ytd-time', secondsToHMS(secs));
  setText('ytd-avg-pace', secPerKmToPace(avgPaceSec));
  setText('ytd-elev', `${Math.round(elev)} m`);
  setText('ytd-longest', `${longest.toFixed(1)} km`);

  const upd = document.getElementById('updatedAt');
  if (upd) upd.textContent = updatedAt ? `Aktualisiert: ${new Date(updatedAt).toLocaleString('de-CH')}` : '';
}

function renderList(runs){
  const container = document.getElementById('strava-container');
  if (!container) return;

  const items = runs.slice(0, 12).map(run => {
    const date = new Date(run.date).toLocaleDateString('de-CH');
    const secs = deriveSeconds(run);
    const paceSec = derivePaceSecPerKm(run);
    const duration = secondsToHMS(secs);
    const paceStr = secPerKmToPace(paceSec);

    return `
      <div class="run">
        <h3>${run.name}</h3>
        <p><strong>${date}</strong></p>
        <p>${run.distance_km?.toFixed(2)} km · Pace ${paceStr}</p>
        <p>⛰ ${Math.round(run.elevation_gain_m||0)} m · 🕒 ${duration}</p>
      </div>
    `;
  }).join('');

  container.innerHTML = items || '<p>Keine Läufe gefunden.</p>';
}

// ============================================
// Boot
// ============================================
async function bootSport(){
  try{
    const data = await fetchJsonWithFallback();
    const runs = Array.isArray(data.runs) ? data.runs : [];
    renderYTD(runs, data.updatedAt);
    renderList(runs);
  }catch(err){
    console.error('[Strava] Fehler:', err);
    const c = document.getElementById('strava-container');
    if (c) c.innerHTML = '<p>Fehler beim Laden der Strava-Daten.</p>';
  }
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}

if (onSportPage()){
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSport);
  } else {
    bootSport();
  }
}
