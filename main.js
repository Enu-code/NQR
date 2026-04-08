/* main.js — NQR shared scripts */

// ── NAV scroll effect ──
const nav = document.getElementById('mainNav');
const progressBar = document.getElementById('progressBar');
if (nav) {
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    nav.classList.toggle('scrolled', scrolled > 40);
    
    // Update Scroll Progress Bar
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar && totalHeight > 0) {
      const progress = (scrolled / totalHeight) * 100;
      progressBar.style.width = progress + '%';
    }
  }, { passive: true });
}

// ── Mobile nav ──
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
const mobileClose = document.getElementById('mobileClose');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => mobileNav.classList.add('open'));
  mobileClose?.addEventListener('click', () => mobileNav.classList.remove('open'));
}

// ── QR Generation helper ──
function generateQR(canvasId, text, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.QRCode) return;
  const size = opts.size || canvas.width || 140;
  QRCode.toCanvas(canvas, text || 'https://nqr.io', {
    width: size,
    margin: 1,
    color: {
      dark: opts.dark || '#0F1636',
      light: opts.light || '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  }, (err) => { if (err) console.warn('QR error:', err); });
}

// ── Hero QR ──
window.addEventListener('load', () => {
  generateQR('heroQR', 'https://nqr.io/demo', { size: 140 });
  generateQR('featQR', 'https://nqr.io', { size: 80 });
});

// ── Intersection observer for fade-up on scroll ──
const observeEls = document.querySelectorAll('.card, .uc-card, .hiw__step, .pricing-card');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  observeEls.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)';
    io.observe(el);
  });
}
