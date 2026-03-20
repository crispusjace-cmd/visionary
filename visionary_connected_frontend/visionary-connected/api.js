// ============================================================
//  api.js  —  All calls to the Visionary School backend
//  Change API_URL below when you deploy online
// ============================================================

const API_URL = 'http://localhost:5000/api';

// ── Token helpers ────────────────────────────────────────────
const getToken = () => localStorage.getItem('vsms_token');
const setToken = (t) => localStorage.setItem('vsms_token', t);
const setUser  = (u) => localStorage.setItem('vsms_user', JSON.stringify(u));
const getUser  = () => JSON.parse(localStorage.getItem('vsms_user') || 'null');
const clearAuth = () => { localStorage.removeItem('vsms_token'); localStorage.removeItem('vsms_user'); };

// ── Base fetch wrapper ───────────────────────────────────────
async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

// ── Auth ─────────────────────────────────────────────────────
const Auth = {
  async login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token);
    setUser(data.user);
    return data;
  },
  logout() { clearAuth(); },
  me() { return api('/auth/me'); },
  currentUser() { return getUser(); },
  isLoggedIn() { return !!getToken(); },
};

// ── Students ─────────────────────────────────────────────────
const Students = {
  list()       { return api('/students'); },
  get(id)      { return api(`/students/${id}`); },
  create(data) { return api('/students', { method: 'POST', body: data }); },
  update(id, data) { return api(`/students/${id}`, { method: 'PUT', body: data }); },
  delete(id)   { return api(`/students/${id}`, { method: 'DELETE' }); },
};

// ── Teachers ─────────────────────────────────────────────────
const Teachers = {
  list()       { return api('/teachers'); },
  create(data) { return api('/teachers', { method: 'POST', body: data }); },
  delete(id)   { return api(`/teachers/${id}`, { method: 'DELETE' }); },
};

// ── Marks ────────────────────────────────────────────────────
const Marks = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return api(`/marks${q ? '?' + q : ''}`);
  },
  submit(entries) { return api('/marks', { method: 'POST', body: { entries } }); },
};

// ── Attendance ───────────────────────────────────────────────
const Attendance = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return api(`/attendance${q ? '?' + q : ''}`);
  },
  submit(records) { return api('/attendance', { method: 'POST', body: { records } }); },
};

// ── Fees ─────────────────────────────────────────────────────
const Fees = {
  list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return api(`/fees${q ? '?' + q : ''}`);
  },
  recordPayment(data) { return api('/fees/payment', { method: 'POST', body: data }); },
};

// ── Notices ──────────────────────────────────────────────────
const Notices = {
  list()       { return api('/notices'); },
  create(data) { return api('/notices', { method: 'POST', body: data }); },
  delete(id)   { return api(`/notices/${id}`, { method: 'DELETE' }); },
};

// ── Reports ──────────────────────────────────────────────────
const Reports = {
  summary() { return api('/reports/summary'); },
};
