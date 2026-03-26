// ===== API HELPER =====
const API = '';

function getToken() { return localStorage.getItem('authToken'); }
function setToken(t) { localStorage.setItem('authToken', t); }
function removeToken() { localStorage.removeItem('authToken'); }

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ===== STATE =====
let currentCategory = 'all';
let allForms = [];
let allVideos = [];

const catIcons = { gov: '🏛', bank: '🏦', health: '🏥', id: '🪪' };
const catLabels = { gov: 'Government', bank: 'Bank', health: 'Health', id: 'Identity' };
const catBadge = { gov: 'badge-gov', bank: 'badge-bank', health: 'badge-health', id: 'badge-id' };

// ===== PAGE NAVIGATION =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(page + 'Page').classList.add('active');
  if (page === 'videos') loadVideos();
  const btns = document.querySelectorAll('.nav-btn');
  if (page === 'home') btns[0].classList.add('active');
  if (page === 'videos') btns[1].classList.add('active');
}

// ===== CATEGORY & SEARCH =====
function filterCategory(cat, el) {
  currentCategory = cat;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadForms();
}

// ===== LOAD & RENDER FORMS =====
async function loadForms() {
  try {
    const search = (document.getElementById('searchInput').value || '').trim();
    let url = '/api/forms?';
    if (currentCategory !== 'all') url += 'category=' + currentCategory + '&';
    if (search) url += 'search=' + encodeURIComponent(search);
    const forms = await api(url);
    allForms = forms;
    renderForms(forms);
    updateStats();
  } catch (e) { console.error('Failed to load forms:', e); }
}

function renderForms(forms) {
  const grid = document.getElementById('formsGrid');
  if (!forms.length) {
    grid.innerHTML = '<div class="no-results" style="grid-column:1/-1;">😕 No forms found. Try a different search or category.</div>';
    return;
  }
  grid.innerHTML = forms.map(f => `
    <div class="form-card">
      <div class="form-card-header">
        <div class="form-icon ${f.category}">${catIcons[f.category]}</div>
        <div class="form-meta">
          <h3>${esc(f.name)}</h3>
          <p>${esc(f.description)}</p>
        </div>
        <span class="form-badge ${catBadge[f.category]}">${catLabels[f.category]}</span>
      </div>
      <div class="form-detail-box">
        <h4>📖 What is this form?</h4>
        <p>${esc(f.detail)}</p>
      </div>
      <div class="form-actions">
        ${f.link ? `<a class="action-btn btn-primary" href="${esc(f.link)}" target="_blank">📥 Get Form</a>` : ''}
        ${f.video ? `<button class="action-btn btn-outline" onclick="window.open('${esc(f.video)}','_blank')">▶ Watch Guide</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function updateStats() {
  try {
    const forms = await api('/api/forms');
    const videos = await api('/api/videos');
    document.getElementById('statForms').textContent = forms.length;
    document.getElementById('statVideos').textContent = videos.length;
  } catch (e) {}
}

// ===== LOAD & RENDER VIDEOS =====
async function loadVideos() {
  try {
    const videos = await api('/api/videos');
    allVideos = videos;
    renderVideos(videos);
  } catch (e) { console.error('Failed to load videos:', e); }
}

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function renderVideos(videos) {
  const grid = document.getElementById('videoGrid');
  if (!videos.length) {
    grid.innerHTML = '<div class="no-results" style="grid-column:1/-1;">No videos added yet. Ask admin to add video guides.</div>';
    return;
  }
  grid.innerHTML = videos.map(v => {
    const vid = getYouTubeId(v.url);
    const thumb = vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : '';
    return `
      <div class="video-card">
        <div class="video-thumb" style="${thumb ? `background:url('${thumb}') center/cover` : ''}">
          ${!thumb ? '<div class="video-placeholder">🎬</div>' : ''}
          <div class="yt-overlay">▶ YouTube</div>
        </div>
        <div class="video-info">
          <h4>${esc(v.title)}</h4>
          <p>${esc(v.description)}</p>
          ${v.url ? `<button class="watch-btn" onclick="window.open('${esc(v.url)}','_blank')">▶ Watch on YouTube</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}



// ===== MODAL & TOAST =====
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== ESCAPING =====
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ===== INIT =====
loadForms();
