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
let adminLoggedIn = !!getToken();
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
  if (page === 'admin') { if (!adminLoggedIn) { openAdminLogin(); return; } loadAdmin(); }
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

// ===== ADMIN LOGIN =====
function openAdminLogin() {
  document.getElementById('loginOverlay').classList.add('open');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').style.display = 'none';
}

function closeLogin() {
  document.getElementById('loginOverlay').classList.remove('open');
}

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value.trim();
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setToken(data.token);
    adminLoggedIn = true;
    closeLogin();
    showPage('admin');
    showToast('✅ Welcome to Admin Panel!', 'success');
  } catch (e) {
    document.getElementById('loginError').style.display = 'block';
  }
}

function adminLogout() {
  removeToken();
  adminLoggedIn = false;
  showPage('home');
  showToast('👋 Logged out successfully.', 'success');
}

// ===== ADMIN RENDER =====
async function loadAdmin() {
  try {
    const stats = await api('/api/stats');
    document.getElementById('adminStats').innerHTML = `
      <div class="stat-card"><div class="stat-card-icon blue">📋</div><div><div class="stat-card-val">${stats.totalForms}</div><div class="stat-card-label">Total Forms</div></div></div>
      <div class="stat-card"><div class="stat-card-icon green">🎬</div><div><div class="stat-card-val">${stats.totalVideos}</div><div class="stat-card-label">Video Guides</div></div></div>
      <div class="stat-card"><div class="stat-card-icon gold">🏛</div><div><div class="stat-card-val">${stats.govForms}</div><div class="stat-card-label">Gov Forms</div></div></div>
      <div class="stat-card"><div class="stat-card-icon purple">🏦</div><div><div class="stat-card-val">${stats.bankForms}</div><div class="stat-card-label">Bank Forms</div></div></div>
    `;

    const forms = await api('/api/forms');
    document.getElementById('adminFormsTbody').innerHTML = forms.map(f => `
      <tr>
        <td><strong>${esc(f.name)}</strong></td>
        <td><span class="form-badge ${catBadge[f.category]}">${catIcons[f.category]} ${catLabels[f.category]}</span></td>
        <td><span class="status-pill status-active">Active</span></td>
        <td>
          <button class="action-btn btn-yellow" onclick="openEditForm(${f.id})" style="margin-right:4px;">✏️ Edit</button>
          <button class="action-btn btn-red" onclick="deleteForm(${f.id})">🗑 Delete</button>
        </td>
      </tr>
    `).join('');

    const videos = await api('/api/videos');
    document.getElementById('adminVideosTbody').innerHTML = videos.map(v => `
      <tr>
        <td><strong>${esc(v.title)}</strong></td>
        <td>${esc(v.description).substring(0, 55)}…</td>
        <td><a href="${esc(v.url)}" target="_blank" style="color:var(--blue);font-size:0.8rem;">🔗 Link</a></td>
        <td>
          <button class="action-btn btn-yellow" onclick="openEditVideo(${v.id})" style="margin-right:4px;">✏️ Edit</button>
          <button class="action-btn btn-red" onclick="deleteVideo(${v.id})">🗑 Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    if (e.message.includes('Authentication') || e.message.includes('token')) {
      removeToken(); adminLoggedIn = false;
      showToast('❌ Session expired. Please login again.', 'error');
      showPage('home');
    }
  }
}

function switchAdminTab(tab, el) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('admin' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
}

// ===== FORM CRUD =====
function openAddForm() {
  document.getElementById('formModalTitle').textContent = 'Add New Form';
  document.getElementById('editFormId').value = '';
  ['fName','fDesc','fDetail','fLink','fVideo'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fCategory').value = 'gov';
  document.getElementById('formModal').classList.add('open');
}

async function openEditForm(id) {
  try {
    const forms = await api('/api/forms');
    const f = forms.find(x => x.id === id);
    if (!f) return;
    document.getElementById('formModalTitle').textContent = 'Edit Form';
    document.getElementById('editFormId').value = id;
    document.getElementById('fName').value = f.name;
    document.getElementById('fCategory').value = f.category;
    document.getElementById('fDesc').value = f.description;
    document.getElementById('fDetail').value = f.detail;
    document.getElementById('fLink').value = f.link || '';
    document.getElementById('fVideo').value = f.video || '';
    document.getElementById('formModal').classList.add('open');
  } catch (e) { showToast('❌ Failed to load form', 'error'); }
}

async function saveForm() {
  const name = document.getElementById('fName').value.trim();
  const category = document.getElementById('fCategory').value;
  const description = document.getElementById('fDesc').value.trim();
  const detail = document.getElementById('fDetail').value.trim();
  const link = document.getElementById('fLink').value.trim();
  const video = document.getElementById('fVideo').value.trim();
  if (!name || !description) { showToast('❌ Name and description are required.', 'error'); return; }

  const body = JSON.stringify({ name, category, description, detail, link, video });
  const editId = parseInt(document.getElementById('editFormId').value);

  try {
    if (editId) {
      await api('/api/forms/' + editId, { method: 'PUT', body });
      showToast('✅ Form updated successfully!', 'success');
    } else {
      await api('/api/forms', { method: 'POST', body });
      showToast('✅ Form added successfully!', 'success');
    }
    closeModal('formModal');
    loadAdmin();
    loadForms();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function deleteForm(id) {
  if (!confirm('Delete this form?')) return;
  try {
    await api('/api/forms/' + id, { method: 'DELETE' });
    showToast('🗑 Form deleted.', 'success');
    loadAdmin();
    loadForms();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

// ===== VIDEO CRUD =====
function openAddVideo() {
  document.getElementById('videoModalTitle').textContent = 'Add Video Guide';
  document.getElementById('editVideoId').value = '';
  ['vTitle','vDesc','vUrl'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('videoModal').classList.add('open');
}

async function openEditVideo(id) {
  try {
    const videos = await api('/api/videos');
    const v = videos.find(x => x.id === id);
    if (!v) return;
    document.getElementById('videoModalTitle').textContent = 'Edit Video';
    document.getElementById('editVideoId').value = id;
    document.getElementById('vTitle').value = v.title;
    document.getElementById('vDesc').value = v.description;
    document.getElementById('vUrl').value = v.url;
    document.getElementById('videoModal').classList.add('open');
  } catch (e) { showToast('❌ Failed to load video', 'error'); }
}

async function saveVideo() {
  const title = document.getElementById('vTitle').value.trim();
  const description = document.getElementById('vDesc').value.trim();
  const url = document.getElementById('vUrl').value.trim();
  if (!title || !url) { showToast('❌ Title and URL are required.', 'error'); return; }

  const body = JSON.stringify({ title, description, url });
  const editId = parseInt(document.getElementById('editVideoId').value);

  try {
    if (editId) {
      await api('/api/videos/' + editId, { method: 'PUT', body });
      showToast('✅ Video updated!', 'success');
    } else {
      await api('/api/videos', { method: 'POST', body });
      showToast('✅ Video added!', 'success');
    }
    closeModal('videoModal');
    loadAdmin();
    loadVideos();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  try {
    await api('/api/videos/' + id, { method: 'DELETE' });
    showToast('🗑 Video deleted.', 'success');
    loadAdmin();
    loadVideos();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
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
