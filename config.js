/**
 * config.js — Global configuration for NQR
 */
const CONFIG = {
  BRAND: {
    NAME: "NQR",
    FULL_NAME: "NQR — Smart QR Sharing",
    POWERED_BY: "Neverno",
    DOMAIN: "nqr.io",
    SUPPORT_EMAIL: "support@nqr.io",
    VERSION: "2.1.0"
  },
  API: {
    // 🌐 PRODUCTION AWS API
    // Replace with your URL after 'sam deploy'
    BASE_URL: 'https://PASTE_YOUR_AWS_API_URL_HERE.execute-api.us-east-1.amazonaws.com/Prod',
  },
  STORAGE: {
    USE_LOCAL: false, // Switch to cloud storage
  }
};

window.NQR_CONFIG = CONFIG;
