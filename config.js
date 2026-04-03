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
    // 🌐 PRODUCTION AWS API (eu-north-1 Stockholm)
    // After running 'sam deploy', paste your specific API ID below.
    BASE_URL: 'https://aqurm1rfn7.execute-api.eu-north-1.amazonaws.com/Prod',
  },
  STORAGE: {
    USE_LOCAL: false, // Cloud storage enabled for public sync
  }
};

window.NQR_CONFIG = CONFIG;
