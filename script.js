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

// --- kleine Helfer ---
function fmtTime(sec){
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = Math.floor(sec%60);
  const pad = n => n.toString().padStart(2,'0');
  return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function fmtPace(secPerKm){
  const m = Math.floor(secPerKm/60);
  const s = Math.floor(secPerKm%60);
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')} min/km`;
}
function chDate(d){
  return new Date(d).toLocaleDateString('de-CH', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// --- hier wird gerendert ---
function renderRuns(activities){
  const el = document.getElementById('strava-container');
  el.innerHTML = '';

  activities.forEach(a => {
    const km = (a.distance/1000);
    const pace = a.moving_time / km; // sec per km

    const card = document.createElement('article');
    card.className = 'run-card card'; // 'card' => übernimmt deinen globalen Card-Look

    card.innerHTML = `
      <header>
        <h3>${a.name || 'Lauf'}</h3>
        <time datetime="${a.start_date_local || a.start_date}">${chDate(a.start_date_local || a.start_date)}</time>
      </header>

      <div class="dist">${km.toFixed(2)} km · <span class="muted">Pace ${fmtPace(pace)}</span></div>

      <div class="row">▲ ${Math.round(a.total_elevation_gain ?? 0)} m · ⏱ ${fmtTime(a.moving_time)}</div>
    `;

    el.appendChild(card);
  });
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
// Navbar: active Link, mobile Toggle, Header-Shadow, Footer-Jahr
function setActiveNav(){
  const p = location.pathname;
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  if (p.endsWith('/sport.html') || p.endsWith('sport.html')) {
    document.querySelector('[data-nav="sport"]')?.classList.add('active');
  } else if (p.endsWith('/erfahrung.html') || p.endsWith('erfahrung.html')) {
    document.querySelector('[data-nav="edu"]')?.classList.add('active');
  } else if (p.endsWith('/me.html') || p.endsWith('me.html')) {
    document.querySelector('[data-nav="me"]')?.classList.add('active');
  }
   else {
    document.querySelector('[data-nav="home"]')?.classList.add('active');
  }
}
function initNav(){
  setActiveNav();
  const btn = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-links');
  btn?.addEventListener('click', ()=> menu?.classList.toggle('open'));
  window.addEventListener('scroll', ()=>{
    if (window.scrollY > 6) document.body.classList.add('scrolled');
    else document.body.classList.remove('scrolled');
  });
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNav);
} else { initNav(); }




// ====== The Cat API Setup ======
const CAT_API_URL =
  'https://api.thecatapi.com/v1/images/search?limit=1'
  + '&mime_types=jpg,png'   // nur statische Bilder (kein GIF)
  + '&size=small'           // kleinere Dateien = schneller
  + '&order=RANDOM';

const CAT_API_KEY = 'HIER_DEIN_API_KEY'; // <-- einsetzen
const catHeaders = CAT_API_KEY ? { 'x-api-key': CAT_API_KEY } : {};

// ====== DOM-Refs ======
const catImg      = document.getElementById('cat-img');
const catNextBtn  = document.getElementById('cat-next');
const catAutoplay = document.getElementById('cat-autoplay');
const catCaption  = document.getElementById('cat-caption');

// ====== Laden & Rendern ======
async function fetchCatUrl() {
  const res  = await fetch(CAT_API_URL, { headers: catHeaders });
  if (!res.ok) throw new Error('Cat API antwortet nicht');
  const data = await res.json();
  const item = data?.[0];
  return {
    url: item?.url,
    alt: (item?.breeds?.[0]?.name ? `Katze: ${item.breeds[0].name}` : 'Zufällige Katze')
  };
}

let preloaded = null;
async function preloadNext() {
  try {
    const { url, alt } = await fetchCatUrl();
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.referrerPolicy = 'no-referrer';
      img.src = url;
    });
    preloaded = { url, alt };
  } catch (e) {
    console.error(e);
    preloaded = null;
  }
}

async function showNextCat() {
  try {
    // wenn vorab geladen, direkt anzeigen – sonst normal laden
    if (preloaded) {
      catImg.src = preloaded.url;
      catImg.alt = preloaded.alt;
      catCaption.textContent = preloaded.alt;
      preloaded = null;
      // gleich den nächsten vorladen
      preloadNext();
    } else {
      const { url, alt } = await fetchCatUrl();
      catImg.src = url;
      catImg.alt = alt;
      catCaption.textContent = alt;
      preloadNext();
    }
  } catch (e) {
    console.error('Fehler beim Laden des Katzenbilds:', e);
    catCaption.textContent = 'Fehler beim Laden 😿 – bitte erneut versuchen.';
  }
}

// ====== Autoplay (5 s) ======
let timer = null;
function startAuto() {
  stopAuto();
  timer = setInterval(showNextCat, 5000);
}
function stopAuto() {
  if (timer) clearInterval(timer);
  timer = null;
}

// Bedienung
catNextBtn?.addEventListener('click', showNextCat);
catAutoplay?.addEventListener('change', e => {
  e.target.checked ? startAuto() : stopAuto();
});

// Seite/Tab nicht sichtbar → pausieren (spart Requests)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAuto();
  else if (catAutoplay?.checked) startAuto();
});

// Initial
showNextCat();   // erstes Bild
startAuto();     // Autoplay an

