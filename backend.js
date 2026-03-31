/**
 * backend.js — NQR Data & Auth Abstraction Layer
 * FINAL PRODUCTION VERSION: Communicates with AWS Lambda/DynamoDB Cloud.
 */
class NQRBackend {
  constructor() {
    this.config = window.NQR_CONFIG;
    this.apiUrl = this.config.API.BASE_URL;
  }

  // ── HELPER: FETCH ──
  async request(path, method = 'GET', body = null) {
    if (this.config.STORAGE.USE_LOCAL) {
      return this.mockRequest(path, method, body);
    }

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${this.apiUrl}${path}`, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'API Request Failed');
    return data;
  }

  // ── AUTH ──
  async signup(userData) {
    const result = await this.request('/signup', 'POST', userData);
    sessionStorage.setItem('userLoggedIn', 'true');
    sessionStorage.setItem('userEmail', userData.email);
    sessionStorage.setItem('userName', `${userData.firstName} ${userData.lastName}`);
    return result;
  }

  async login(email, password) {
    // Current requirement: Keep admin/user login simple for now
    const result = await this.request('/login', 'POST', { email, password });
    sessionStorage.setItem('userLoggedIn', 'true');
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userName', 'User Account');
    return result;
  }

  isLoggedIn() {
    return sessionStorage.getItem('userLoggedIn') === 'true';
  }

  logout() {
    sessionStorage.removeItem('userLoggedIn');
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('userEmail');
    window.location.href = 'index.html';
  }

  // ── QR MANAGEMENT ──
  async saveQR(qrData) {
    const email = sessionStorage.getItem('userEmail') || 'anonymous@nqr.io';
    const payload = { ...qrData, ownerEmail: email };
    return await this.request('/qrs', 'POST', payload);
  }

  async getHistory() {
    const email = sessionStorage.getItem('userEmail');
    if (!email) return [];
    return await this.request(`/qrs?ownerEmail=${encodeURIComponent(email)}`, 'GET');
  }

  // ── ADMIN METHODS ──
  async getPlatformStats() {
    return await this.request('/admin/stats', 'GET');
  }

  async getAllUsers() {
    return await this.request('/admin/users', 'GET');
  }

  async getAllQRs() {
    return await this.request('/admin/qrs', 'GET');
  }

  // ── MOCK FALLBACK (If needed) ──
  mockRequest(path, method, body) {
    console.warn("Using Local Mock Backup for:", path);
    // Legacy localStorage logic could go here
    return { success: true, mock: true };
  }
}

window.API = new NQRBackend();
