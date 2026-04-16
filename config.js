/**
 * config.js — Global configuration for NQR
 */
const CONFIG = {
  BRAND: {
    NAME: "NQR",
    FULL_NAME: "NQR — Smart QR Sharing",
    POWERED_BY: "Neverno",
    DOMAIN: "neverq.in",
    SUPPORT_EMAIL: "support@neverno.in",
    VERSION: "2.1.0"
  },
  API: {
    // 🌐 PRODUCTION API ENDPOINT
    // LOCALHOST for immediate testing
    BASE_URL: 'http://localhost:8001',
    // LIVE SERVER (requires restart)
    // BASE_URL: 'https://api.neverq.in',
  },
  STORAGE: {
    USE_LOCAL: false, // Cloud storage enabled for public sync
  }
};

window.NQR_CONFIG = CONFIG;
