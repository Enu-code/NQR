/**
 * backend.js — NQR Data & Auth Abstraction Layer
 * v4.0 — HARDENED CLOUD SUITE
 *
 * Features:
 *  ① JWT token management (localStorage) with expiry check
 *  ② checkSession()  — auto-redirect if valid token found
 *  ③ guardRoute()    — protects app pages from unauthenticated access
 *  ④ Toast system    — global red glassmorphism alerts (no UI edits needed)
 *  ⑤ 401 / 500 interceptor inside request()
 *  ⑥ Cold-start detection — "Connecting to Secure Server..." state
 *  ⑦ Payload sanitiser — strips extraneous whitespace before every POST
 */

/* ════════════════════════════════════════════════════════
   ① TOAST NOTIFICATION SYSTEM
   Self-contained — injects its own DOM element.
   Usage: NQRToast.show('message', 'error' | 'success' | 'info')
════════════════════════════════════════════════════════ */
const NQRToast = (() => {
  let container = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.id = 'nqr-toast-container';
    Object.assign(container.style, {
      position:      'fixed',
      bottom:        '1.5rem',
      right:         '1.5rem',
      zIndex:        '99999',
      display:       'flex',
      flexDirection: 'column',
      gap:           '0.6rem',
      pointerEvents: 'none',
    });
    document.body.appendChild(container);
    return container;
  }

  const VARIANTS = {
    error:   { bg: 'rgba(147,0,10,0.22)', border: 'rgba(217,4,41,0.45)',   icon: '⚠', color: '#ffb4ab' },
    success: { bg: 'rgba(0,120,50,0.22)',  border: 'rgba(0,200,80,0.45)',  icon: '✓', color: '#a8ffce' },
    info:    { bg: 'rgba(10,60,120,0.22)', border: 'rgba(80,140,255,0.45)', icon: 'ℹ', color: '#a8ccff' },
  };

  function show(message, type = 'error', duration = 4000) {
    const c   = ensureContainer();
    const v   = VARIANTS[type] || VARIANTS.error;
    const el  = document.createElement('div');

    Object.assign(el.style, {
      display:            'flex',
      alignItems:         'flex-start',
      gap:                '0.6rem',
      padding:            '0.85rem 1.1rem',
      borderRadius:       '12px',
      background:         v.bg,
      border:             `1px solid ${v.border}`,
      backdropFilter:     'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      color:              v.color,
      fontFamily:         "'Inter', sans-serif",
      fontSize:           '0.82rem',
      lineHeight:         '1.45',
      maxWidth:           '340px',
      pointerEvents:      'auto',
      boxShadow:          '0 8px 32px rgba(0,0,0,0.4)',
      opacity:            '0',
      transform:          'translateY(12px)',
      transition:         'opacity 0.3s ease, transform 0.3s ease',
    });

    el.innerHTML = `<span style="font-size:1rem;flex-shrink:0;margin-top:1px;">${v.icon}</span><span>${message}</span>`;
    c.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    });

    // Animate out + remove
    setTimeout(() => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(12px)';
      setTimeout(() => el.remove(), 320);
    }, duration);
  }

  return { show };
})();

/* ════════════════════════════════════════════════════════
   ② JWT HELPERS — decode payload without a library
════════════════════════════════════════════════════════ */
const NQRAuth = {
  TOKEN_KEY: 'nqr_auth_token',

  /** Save raw JWT string */
  saveToken(token) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
  },

  /** Get raw JWT string or null */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  /** Remove token (logout) */
  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  },

  /**
   * Decode JWT payload without verifying signature.
   * Signature verification happens server-side on every request.
   * Returns the payload object or null if malformed/expired.
   */
  decodeToken(token) {
    try {
      const parts = (token || '').split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      // Check expiry (exp is Unix seconds)
      if (payload.exp && Date.now() / 1000 > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  },

  /** Returns true if a valid, non-expired token is stored */
  isValid() {
    const token = this.getToken();
    if (!token) return false;
    return this.decodeToken(token) !== null;
  },
};

/* ════════════════════════════════════════════════════════
   ③ SESSION GUARD
════════════════════════════════════════════════════════ */

/**
 * checkSession() — call on LOGIN page load.
 * If a valid JWT already exists, skip the login form
 * and redirect straight to the app.
 */
function checkSession() {
  if (NQRAuth.isValid()) {
    // Restore sessionStorage keys for legacy compatibility
    const token   = NQRAuth.getToken();
    const payload = NQRAuth.decodeToken(token);
    sessionStorage.setItem('userLoggedIn', 'true');
    if (payload?.email) sessionStorage.setItem('userEmail', payload.email);
    if (payload?.name)  sessionStorage.setItem('userName',  payload.name);
    window.location.replace('app-generator.html');
  }
}

/**
 * guardRoute() — call on PROTECTED pages (app-generator, admin, etc.).
 * If NO valid session exists, boot the user to login.
 */
function guardRoute() {
  const loggedIn = sessionStorage.getItem('userLoggedIn') === 'true';
  const hasToken = NQRAuth.isValid();

  if (!loggedIn && !hasToken) {
    NQRToast.show('Session expired. Please sign in again.', 'info', 3000);
    setTimeout(() => {
      window.location.replace('user-login.html');
    }, 1200);
  }
}

/* ════════════════════════════════════════════════════════
   ④ PAYLOAD SANITISER
   Strips leading/trailing whitespace from all string values
   in a plain object before sending to Lambda.
════════════════════════════════════════════════════════ */
function sanitizePayload(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      clean[key] = value.trim().replace(/\s+/g, ' '); // collapse internal extra spaces
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizePayload(value); // recurse for nested objects
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/* ════════════════════════════════════════════════════════
   ⑤ MAIN BACKEND CLASS
════════════════════════════════════════════════════════ */
class NQRBackend {
  constructor() {
    this.config = window.NQR_CONFIG;
    this.apiUrl = this.config.API.BASE_URL;

    // Cold-start detection — Lambda first-hit can take 2-4 seconds.
    // We track when a request starts and update the active submit button text.
    this._coldStartTimer   = null;
    this._COLD_START_MS    = 2500; // show "Connecting..." after this many ms
    this._activeSubmitBtn  = null; // set by callers via setColdStartTarget()
  }

  /* ── Cold-start helpers ── */

  /** Call before a slow request to arm the cold-start indicator. */
  _armColdStart() {
    this._clearColdStart();
    this._coldStartTimer = setTimeout(() => {
      const btn = document.querySelector('#authSubmitBtn, button[type="submit"]');
      if (btn && !btn.classList.contains('btn-loading')) return; // already in loading
      if (btn) {
        btn.setAttribute('data-cold-label', btn.innerHTML);
        const spans = btn.querySelectorAll('.btn-text');
        spans.forEach(s => { s.textContent = ''; });
        // Insert cold-start label
        const label = document.createElement('span');
        label.className = 'btn-text cold-start-label';
        label.style.cssText = 'opacity:1;font-size:0.78em;letter-spacing:0.05em;';
        label.textContent = 'Connecting to Secure Server…';
        btn.appendChild(label);
      }
    }, this._COLD_START_MS);
  }

  _clearColdStart() {
    if (this._coldStartTimer) {
      clearTimeout(this._coldStartTimer);
      this._coldStartTimer = null;
    }
    // Remove cold-start label if present
    document.querySelectorAll('.cold-start-label').forEach(el => el.remove());
  }

  /* ── Core request helper ── */

  /**
   * Universal fetch wrapper.
   * - Attaches JWT Authorization header if token exists
   * - Sanitises request body payload
   * - Handles 401 (token expired) and 5xx (server errors) globally
   * - Arms/clears cold-start indicator
   */
  async request(path, method = 'GET', body = null, { silent = false } = {}) {
    // ── Local mock mode ──
    if (this.config.STORAGE.USE_LOCAL) {
      return this.mockRequest(path, method, body);
    }

    // ── Build headers ──
    const headers = {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      // CORS pre-flight: these are the only safe custom headers
    };

    const token = NQRAuth.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // ── Build fetch options ──
    const options = { method, headers };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
      options.body = JSON.stringify(sanitizePayload(body));
    }

    // ── Arm cold-start indicator ──
    this._armColdStart();

    let response;
    try {
      response = await fetch(`${this.apiUrl}${path}`, options);
    } catch (networkErr) {
      // Network failure (no internet, DNS, CORS blocked pre-flight, etc.)
      this._clearColdStart();

      // Suppress toast for aborted requests (happens during page navigation)
      const isAbort = networkErr.name === 'AbortError' || networkErr.message?.toLowerCase().includes('aborted');

      if (!silent && !isAbort) {
        NQRToast.show('No internet connection or server unreachable. Please check your network.', 'error');
      }
      throw new Error('Network error: ' + networkErr.message);
    }

    this._clearColdStart();

    // ── Parse response ──
    let data;
    const contentType = response.headers.get('content-type') || '';
    try {
      data = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };
    } catch {
      data = { message: 'Malformed server response.' };
    }

    // ── Global error interceptor ──
    if (!response.ok) {
      if (response.status === 401) {
        // Only trigger session expiry if the request was authenticated
        const hasAuthHeader = !!(options.headers && options.headers['Authorization']);
        
        if (hasAuthHeader) {
            NQRAuth.clearToken();
            sessionStorage.removeItem('userLoggedIn');
            NQRToast.show('Your session has expired. Please sign in again.', 'info', 5000);
            setTimeout(() => window.location.replace('user-login.html'), 2000);
            throw new Error('Unauthorized');
        }
        // Otherwise, fall through to the default error throw below
      }

      if (response.status >= 500) {
        NQRToast.show(`Server error (${response.status}). Our team has been notified. Please try again shortly.`, 'error');
      }

      throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }

    return data;
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━
     AUTH METHODS
  ━━━━━━━━━━━━━━━━━━━━━━━━ */

  async requestOtp(email, password, mode = 'login') {
    return this.request('/auth/request-otp', 'POST', { email, password, type: 'OTP', action: mode });
  }

  async resetPassword(email, otp, newPassword) {
    return this.request('/auth/reset-password', 'POST', { email, otp, newPassword });
  }

  async signup(userData, otp) {
    const result = await this.request('/auth/signup', 'POST', { 
      email: userData.email, 
      otp: otp,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: userData.password
    });

    // ── Store JWT if returned ──
    if (result.token) NQRAuth.saveToken(result.token);

    // ── Legacy sessionStorage for existing UI compatibility ──
    sessionStorage.setItem('userLoggedIn', 'true');
    sessionStorage.setItem('userEmail', userData.email);
    sessionStorage.setItem('userName', `${userData.firstName} ${userData.lastName}`.trim());

    return result;
  }

  async login(email, password) {
    const result = await this.request('/auth/login', 'POST', { email, password });

    // ── Store JWT / Session info ──
    if (result.token) NQRAuth.saveToken(result.token);

    // ── Legacy sessionStorage for existing UI compatibility ──
    sessionStorage.setItem('userLoggedIn', 'true');
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userName', result.user?.name || result.user?.email || 'User Account');

    return result;
  }

  isLoggedIn() {
    // Accept either sessionStorage (tab-scoped) or a valid JWT (persistent)
    return sessionStorage.getItem('userLoggedIn') === 'true' || NQRAuth.isValid();
  }

  logout() {
    // Clear both storage layers
    NQRAuth.clearToken();
    sessionStorage.removeItem('userLoggedIn');
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    window.location.href = 'index.html';
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━
     QR MANAGEMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━ */

  async saveQR(qrData) {
    return this.request('/qrs', 'POST', qrData);
  }

  async updateQR(qrId, updates) {
    return this.request(`/qrs/${encodeURIComponent(qrId)}`, 'PATCH', updates);
  }

  async deleteQR(qrId) {
    return this.request(`/qrs/${encodeURIComponent(qrId)}`, 'DELETE');
  }

  async getHistory() {
    return this.request('/qrs', 'GET', null, { silent: true });
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━
     LEADS
  ━━━━━━━━━━━━━━━━━━━━━━━━ */

  async getLeads(qrId) {
    const email = sessionStorage.getItem('userEmail');
    const url   = qrId
      ? `/api/leads/?qrId=${encodeURIComponent(qrId)}`
      : `/api/leads/?ownerEmail=${encodeURIComponent(email)}`;
    return this.request(url, 'GET');
  }

  async saveLead(leadData) {
    return this.request('/leads', 'POST', leadData);
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━
     USER SETTINGS (White-Label)
  ━━━━━━━━━━━━━━━━━━━━━━━━ */

  async getUserSettings() {
    const email = sessionStorage.getItem('userEmail');
    if (!email) return {};
    const res = await this.request(`/api/user/settings/?email=${encodeURIComponent(email)}`, 'GET');
    return res.settings || {};
  }

  async saveUserSettings(settings) {
    const email = sessionStorage.getItem('userEmail');
    if (!email) throw new Error('Not logged in');
    return this.request('/api/user/settings/', 'POST', { email, settings });
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━
     ADMIN METHODS
  ━━━━━━━━━━━━━━━━━━━━━━━━ */

  async adminLogin(username, password) {
    const result = await this.request('/api/admin/login/', 'POST', { username, password });

    // ── Store JWT / Session info ──
    if (result.token) NQRAuth.saveToken(result.token);

    // ── Session Flags ──
    sessionStorage.setItem('adminLoggedIn', 'true');
    sessionStorage.setItem('userLoggedIn', 'true'); // Admins are also users
    sessionStorage.setItem('userEmail', result.user?.email || '');
    sessionStorage.setItem('userName', result.user?.name || result.user?.username || 'Admin');

    return result;
  }

  async getPlatformStats()  { return this.request('/api/admin/stats/',  'GET'); }
  async getAllUsers()        { return this.request('/api/admin/users/',  'GET'); }
  async getAllQRs()          { return this.request('/api/admin/qrs/',   'GET'); }
  async deleteAdminQr(id)    { return this.request(`/api/admin/qrs/${id}/`, 'DELETE'); }
  async getAllScans()        { return this.request('/api/admin/scans/',  'GET'); }
  async getAllLeads(ownerEmail) {
    const url = ownerEmail
      ? `/api/admin/leads/?ownerEmail=${encodeURIComponent(ownerEmail)}`
      : '/api/admin/leads/';
    return this.request(url, 'GET');
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━
     MOCK FALLBACK (local dev)
  ━━━━━━━━━━━━━━━━━━━━━━━━ */

  mockRequest(path, method, body) {
    console.warn('[NQR Mock]', method, path, body || '');
    return new Promise((resolve, reject) => {
      const delay = 300 + Math.random() * 200; // simulate latency
      setTimeout(() => {
        if (path === '/auth/login') {
          if (body.email === 'editor@neverno.in' && body.password !== 'password123')
            return reject(new Error('The login email ID or password you entered is incorrect.'));
          resolve({ success: true, mock: true, user: { name: 'Local Tester' }, token: null });

        } else if (path === '/auth/request-otp') {
          resolve({ success: true, mock: true });

        } else if (path === '/auth/signup') {
          if (body.otp !== '123456')
            return reject(new Error('Invalid OTP. Use 123456 for local testing.'));
          resolve({ success: true, mock: true, token: null });

        } else if (path === '/auth/reset-password') {
          if (body.otp !== '123456')
            return reject(new Error('Invalid OTP. Use 123456 for local testing.'));
          resolve({ success: true, mock: true });

        } else if (path.startsWith('/leads')) {
          if (method === 'GET') resolve([]);
          else resolve({ success: true, mock: true });

        } else if (path === '/user/settings') {
          if (method === 'GET') resolve({ settings: {} });
          else resolve({ success: true, mock: true });

        } else {
          resolve({ success: true, mock: true, id: `mock-${Date.now()}` });
        }
      }, delay);
    });
  }
}

/* ════════════════════════════════════════════════════════
   GLOBAL EXPORTS
════════════════════════════════════════════════════════ */
window.API      = new NQRBackend();
window.NQRToast = NQRToast;
window.NQRAuth  = NQRAuth;

/* ════════════════════════════════════════════════════════
   PAGE-LEVEL ROUTE GUARDS
   Runs on DOMContentLoaded — no existing HTML is modified.
════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  /* ── Login page: auto-redirect if already authenticated ── */
  if (page === 'user-login.html' || page === 'signup.html') {
    checkSession();
    return;
  }

  /* ── Protected app pages: kick unauthenticated users ── */
  const PROTECTED = [
    'app-generator.html',
    'admin.html',
    'admin-logs.html',
    'admin-qrs.html',
    'admin-users.html',
    'leads-dashboard.html',
    'analytics.html',
  ];

  if (PROTECTED.includes(page)) {
    guardRoute();
  }
});
