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
  async requestOtp(email, action) {
    return await this.request('/auth/request-otp', 'POST', { email, action, type: 'OTP' });
  }

  async resetPassword(email, otp, newPassword) {
    return await this.request('/auth/reset-password', 'POST', { email, otp, newPassword });
  }

  async signup(userData, otp) {
    const result = await this.request('/auth/signup', 'POST', { ...userData, otp });
    sessionStorage.setItem('userLoggedIn', 'true');
    sessionStorage.setItem('userEmail', userData.email);
    sessionStorage.setItem('userName', `${userData.firstName} ${userData.lastName}`);
    return result;
  }

  async login(email, password) {
    const result = await this.request('/auth/login', 'POST', { email, password });
    sessionStorage.setItem('userLoggedIn', 'true');
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userName', result.user?.name || 'User Account');
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
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (path === '/auth/login') {
          if (body.email === 'editor@neverno.in' && body.password !== 'password123') {
            return reject(new Error('The login email ID or password you entered is incorrect.'));
          }
          resolve({ success: true, mock: true, user: { name: 'Local Tester' } });
        } else if (path === '/auth/request-otp') {
          console.log(`Mock OTP requested for ${body.email} (${body.action})`);
          resolve({ success: true, mock: true });
        } else if (path === '/auth/signup') {
          if (body.otp !== '123456') return reject(new Error('Invalid OTP. Use 123456 for local testing.'));
          resolve({ success: true, mock: true });
        } else if (path === '/auth/reset-password') {
          if (body.otp !== '123456') return reject(new Error('Invalid OTP. Use 123456 for local testing.'));
          resolve({ success: true, mock: true });
        } else {
          resolve({ success: true, mock: true });
        }
      }, 500); // simulate network delay
    });
  }
}

window.API = new NQRBackend();
