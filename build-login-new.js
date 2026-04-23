const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>NQR — Sign In | Smart QR Sharing</title>
<meta name="description" content="Sign in to your NQR account to generate, manage and track your QR codes.">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script src="config.js"></script>
<script src="backend.js"></script>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Inter:wght@100..900&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<script id="tailwind-config">
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-variant": "#353534",
        "on-primary-fixed-variant": "#930018",
        "on-secondary": "#68000e",
        "secondary-fixed": "#ffdad7",
        "on-primary-container": "#ffb4ab",
        "surface-container-highest": "#353534",
        "on-error-container": "#ffdad6",
        "on-error": "#690005",
        "surface-bright": "#393939",
        "surface-dim": "#131313",
        "surface-container": "#201f1f",
        "tertiary": "#ffb787",
        "on-primary": "#690005",
        "outline-variant": "#454650",
        "on-secondary-fixed-variant": "#930018",
        "secondary-fixed-dim": "#ffb3af",
        "on-background": "#e5e2e1",
        "background": "#131313",
        "on-primary-fixed": "#410005",
        "surface": "#131313",
        "surface-tint": "#ffb4ab",
        "on-tertiary-container": "#d58e5d",
        "inverse-primary": "#f8b2aa",
        "on-secondary-container": "#ffe7e5",
        "primary-container": "#D90429",
        "surface-container-low": "#1c1b1b",
        "surface-container-high": "#2a2a2a",
        "inverse-on-surface": "#313030",
        "tertiary-container": "#582800",
        "error-container": "#93000a",
        "on-surface": "#e5e2e1",
        "secondary-container": "#d70028",
        "on-tertiary": "#502400",
        "error": "#ffb4ab",
        "on-tertiary-fixed": "#311300",
        "on-tertiary-fixed-variant": "#6e390f",
        "primary-fixed": "#ffdad6",
        "primary": "#D90429",
        "inverse-surface": "#e5e2e1",
        "outline": "#8f909b",
        "tertiary-fixed-dim": "#ffb787",
        "secondary": "#ffb3af",
        "on-surface-variant": "#c6c5d2",
        "primary-fixed-dim": "#ffb3af",
        "on-secondary-fixed": "#410005",
        "tertiary-fixed": "#ffdcc7",
        "surface-container-lowest": "#0e0e0e"
      },
      fontFamily: {
        "headline": ["Manrope"],
        "body": ["Inter"],
        "label": ["Inter"]
      },
      borderRadius: {"DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem"},
    },
  },
}
</script>
<style>
/* ── GSAP entrance — elements start hidden ── */
.gsap-enter {
    opacity: 0;
    transform: translateY(22px);
}

/* ── Loading state ── */
.btn-loading {
    position: relative;
    pointer-events: none;
    opacity: 0.85;
}
.btn-loading .btn-text { opacity: 0; }
.btn-loading::after {
    content: '';
    position: absolute;
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Error alert ── */
.auth-error-box {
    display: none;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.9rem 1rem;
    border-radius: 10px;
    background: rgba(147, 0, 10, 0.18);
    border: 1px solid rgba(217, 4, 41, 0.35);
    color: #ffb4ab;
    font-size: 0.8rem;
    font-family: 'Inter', sans-serif;
    line-height: 1.5;
    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97);
}
.auth-error-box.visible { display: flex; }
.auth-error-icon {
    font-size: 1rem;
    flex-shrink: 0;
    margin-top: 1px;
    color: #D90429;
}
@keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
    40%, 60% { transform: translate3d(3px, 0, 0); }
}

/* ── Focus label lift ── */
.field-group:focus-within .field-label {
    color: #D90429;
}
/* ── Material Icon settings ── */
.material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* ── Brand gradients ── */
.editorial-gradient {
    background: linear-gradient(145deg, #06040F 0%, #0a0518 50%, #060810 100%);
}
.cta-gradient {
    background: linear-gradient(135deg, #D90429 0%, #84011a 100%);
    box-shadow: 0 8px 32px rgba(217, 4, 41, 0.35);
}
.cta-gradient:hover {
    box-shadow: 0 12px 40px rgba(217, 4, 41, 0.55);
    filter: brightness(1.08);
}
.glass-panel {
    background: rgba(53, 53, 52, 0.4);
    backdrop-filter: blur(20px);
}

/* ── Global reset ── */
*, html, body { box-sizing: border-box; }
::-webkit-scrollbar { display: none; }
* { -ms-overflow-style: none; scrollbar-width: none; }
html, body { overflow-x: hidden; margin: 0; padding: 0; }

/* ── Page background ── */
body {
    background: #060810 !important;
}

/* ── Ambient glow orbs ── */
.glow-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(120px);
    pointer-events: none;
    z-index: 0;
    animation: orb-drift 12s ease-in-out infinite alternate;
}
.glow-orb--1 {
    width: 55vw; height: 55vh;
    background: radial-gradient(circle, rgba(217,4,41,0.12) 0%, transparent 70%);
    top: -15%; left: 30%;
    animation-delay: 0s;
}
.glow-orb--2 {
    width: 35vw; height: 40vh;
    background: radial-gradient(circle, rgba(120, 10, 200, 0.07) 0%, transparent 70%);
    bottom: 0; right: -5%;
    animation-delay: -4s;
}
@keyframes orb-drift {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-3%, 5%) scale(1.08); }
}

/* ── Subtle dot-grid BG ── */
body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
    z-index: 0;
}

/* ── Header ── */
header {
    background: rgba(6, 8, 16, 0.85) !important;
    border-bottom: 1px solid rgba(217, 4, 41, 0.12) !important;
    backdrop-filter: blur(24px) !important;
    position: relative; z-index: 50;
}

/* ── Form section ── */
section.flex-1 {
    position: relative; z-index: 10;
}

/* ── Form card ── */
.form-card {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    padding: 2.5rem;
    backdrop-filter: blur(20px);
    box-shadow: 0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,4,41,0.05);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.form-card:focus-within {
    border-color: rgba(217, 4, 41, 0.2);
    box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(217,4,41,0.08);
}

/* ── Inputs ── */
.w-full.bg-surface-container-highest {
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.07) !important;
    border-radius: 10px !important;
    color: #f0ede8 !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}
.w-full.bg-surface-container-highest:focus {
    border-color: rgba(217, 4, 41, 0.5) !important;
    box-shadow: 0 0 0 3px rgba(217, 4, 41, 0.1) !important;
    outline: none !important;
}

/* ── Submit button ── */
button[type="submit"] {
    transition: all 0.25s ease !important;
    border-radius: 10px !important;
    letter-spacing: 0.04em;
}

/* ── Editorial side ── */
section.hidden.md\:flex {
    position: relative; z-index: 5;
    border-right: 1px solid rgba(217, 4, 41, 0.08);
}

/* ── QR grid decoration (editorial) ── */
.qr-grid-deco {
    position: absolute;
    top: 2.5rem; right: 2.5rem;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    opacity: 0.18;
}
.qr-cell {
    width: 10px; height: 10px;
    border-radius: 2px;
    background: #D90429;
}
.qr-cell.off { background: rgba(255,255,255,0.15); }

/* ── Editorial stats ── */
.editorial-stats {
    display: flex;
    gap: 2rem;
    margin-top: 2.5rem;
}
.stat-block {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}
.stat-num {
    font-family: 'Manrope', sans-serif;
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: #f0ede8;
    line-height: 1;
}
.stat-label {
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(240,237,232,0.35);
    font-family: 'Inter', sans-serif;
}
.stat-divider {
    width: 1px;
    background: rgba(255,255,255,0.08);
    align-self: stretch;
}

/* ── Swipe overlay ── */
.swipe-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; transform: translateX(-120%);
  background: linear-gradient(90deg, transparent 0%, rgba(217,4,41,0.8) 40%, rgba(217,4,41,1) 50%, rgba(217,4,41,0.8) 60%, transparent 100%);
  z-index: 9999; pointer-events: none; backdrop-filter: blur(8px);
}
.swipe-overlay.is-active { animation: swipe 0.8s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
@keyframes swipe { 0% { transform: translateX(-120%) skewX(-15deg); } 50% { transform: translateX(0%) skewX(-5deg); } 100% { transform: translateX(120%) skewX(-15deg); } }

.form-content { transition: opacity 0.4s ease, transform 0.4s ease; }
.form-content.is-fading { opacity: 0; transform: translateY(10px); }

/* Mode visibility toggles */
[data-mode="signup"] .login-only, [data-mode="login"] .signup-only { display: none; }

/* ── Footer ── */
footer {
    background: #060810 !important;
    border-top: 1px solid rgba(217,4,41,0.1) !important;
    position: relative; z-index: 10;
}
</style>
</head>
<body class="bg-background text-on-background font-body selection:bg-secondary-container selection:text-on-secondary-container" data-mode="login">

<!-- Ambient glow orbs -->
<div class="glow-orb glow-orb--1"></div>
<div class="glow-orb glow-orb--2"></div>

<div class="swipe-overlay" id="swipeOverlay"></div>

<!-- TopAppBar -->
<header class="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center px-8 h-20 w-full border-b border-white/5">
<div class="flex items-center gap-3">
  <!-- Back to Home -->
  <a href="index.html" class="group flex items-center gap-2 mr-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[rgba(217,4,41,0.4)] transition-all duration-300 hover:-translate-x-1 active:scale-95 cursor-pointer shadow-lg hover:shadow-[0_0_15px_rgba(217,4,41,0.2)]">
    <span class="material-symbols-outlined text-[14px] text-white/60 group-hover:text-white transition-colors">arrow_back</span>
    <span class="font-label text-[10px] font-bold tracking-[0.15em] uppercase text-white/60 group-hover:text-white transition-colors">Home</span>
  </a>
  <!-- Custom Logo Restored -->
  <div class="w-8 h-8 flex items-center justify-center shrink-0">
    <img src="assets/logo.png" alt="NQR Logo" class="w-full h-full object-contain" style="border-radius: 50% !important; border: 1px solid rgba(255,255,255,0.1);"/>
  </div>
  <span class="font-headline text-2xl font-black tracking-tighter text-[#e5e2e1]">NQR</span>
  <span class="font-label text-[10px] tracking-[0.2em] opacity-40 uppercase pt-1 hidden sm:inline-block">POWERED BY NEVERNO</span>
</div>
<nav class="hidden md:flex items-center gap-8">
  <button class="font-label text-xs uppercase tracking-widest text-[#e5e2e1] font-bold hover:text-[#d90429] transition-colors duration-300" onclick="handleSwitch('login')">Login</button>
  <button class="font-label text-xs uppercase tracking-widest text-[#e5e2e1]/60 hover:text-[#d90429] transition-colors duration-300" onclick="handleSwitch('signup')">Join Us</button>
</nav>
</header>
<main class="min-h-screen pt-20 flex flex-col md:flex-row">
<!-- Editorial Side (Asymmetric Layout) -->
<section class="hidden md:flex w-1/2 relative overflow-hidden editorial-gradient items-end p-16">
  <!-- Background glow -->
  <div class="absolute top-0 left-0 w-full h-full pointer-events-none">
    <div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 60% at 30% 40%, rgba(217,4,41,0.12) 0%, transparent 70%);"></div>
  </div>

  <!-- QR grid decoration top-right -->
  <div class="qr-grid-deco">
    <div class="qr-cell"></div><div class="qr-cell off"></div><div class="qr-cell"></div><div class="qr-cell"></div><div class="qr-cell off"></div>
    <div class="qr-cell off"></div><div class="qr-cell"></div><div class="qr-cell"></div><div class="qr-cell off"></div><div class="qr-cell"></div>
    <div class="qr-cell"></div><div class="qr-cell"></div><div class="qr-cell off"></div><div class="qr-cell"></div><div class="qr-cell"></div>
    <div class="qr-cell off"></div><div class="qr-cell"></div><div class="qr-cell off"></div><div class="qr-cell"></div><div class="qr-cell off"></div>
    <div class="qr-cell"></div><div class="qr-cell off"></div><div class="qr-cell"></div><div class="qr-cell"></div><div class="qr-cell off"></div>
  </div>

  <!-- Editorial content -->
  <div class="relative z-10 space-y-6">
    <!-- Top eyebrow -->
    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
      <div style="width:6px; height:6px; border-radius:50%; background:#D90429; box-shadow:0 0 8px rgba(217,4,41,0.8);"></div>
      <span style="font-size:0.6rem; letter-spacing:0.2em; text-transform:uppercase; color:rgba(240,237,232,0.4); font-family:'Inter',sans-serif; font-weight:700;">NQR Platform</span>
    </div>
    <h1 class="font-headline font-extrabold tracking-tighter text-on-surface" style="font-size:clamp(3.5rem,6vw,5.5rem); line-height:0.92; letter-spacing:-0.04em;">
      Scan.<br/>Share.<br/><span style="color:#D90429;">Dominate.</span>
    </h1>
    <p class="font-body text-on-surface-variant max-w-sm leading-relaxed" style="font-size:0.95rem; opacity:0.55; margin-top:1.2rem;">
      The premium QR platform used by modern teams worldwide. Secure links, vault-grade encryption, and real-time analytics.
    </p>
    <!-- Stats row -->
    <div class="editorial-stats">
      <div class="stat-block">
        <span class="stat-num">50K+</span>
        <span class="stat-label">QRs Generated</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-block">
        <span class="stat-num">99.9%</span>
        <span class="stat-label">Uptime SLA</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-block">
        <span class="stat-num">TLS 1.3</span>
        <span class="stat-label">Encryption</span>
      </div>
    </div>
  </div>

  <!-- Large ghost QR decal -->
  <div class="absolute -right-20 -bottom-20 opacity-[0.04]">
    <span class="material-symbols-outlined text-[40rem] select-none" style="font-variation-settings: 'wght' 100;">qr_code_2</span>
  </div>
</section>

<!-- Login Container -->
<section class="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-24">
<div class="w-full max-w-md space-y-8 form-content form-card" id="formContent">
<!-- Header -->
<div class="space-y-4">
  <h2 class="font-headline text-4xl font-bold tracking-tight text-on-surface login-only">Welcome back</h2>
  <h2 class="font-headline text-4xl font-bold tracking-tight text-on-surface signup-only">Join NQR</h2>
  <p class="font-body text-on-surface-variant text-base opacity-70 login-only">Sign in to start generating and sharing QRs</p>
  <p class="font-body text-on-surface-variant text-base opacity-70 signup-only">Create an account to save and track your QRs.</p>
</div>

<div id="authError" class="auth-error-box" role="alert">
  <span class="material-symbols-outlined auth-error-icon">error</span>
  <span id="authErrorMsg">Something went wrong.</span>
</div>

<!-- Form -->
<form class="space-y-6" onsubmit="handleAuthSubmit(event, this)">
<div class="space-y-6">

  <!-- Full Name Field (Signup Only) -->
  <div class="group signup-only" id="fullNameGroup">
    <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant block mb-2 group-focus-within:text-primary transition-colors">Full Name</label>
    <div class="relative">
      <input class="w-full bg-surface-container-highest border-none rounded-md px-4 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="Your Name" type="text" id="authName"/>
    </div>
  </div>

  <!-- Email Field -->
  <div class="group" id="emailGroup">
    <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant block mb-2 group-focus-within:text-primary transition-colors">Email Address</label>
    <div class="relative">
      <input id="authEmail" class="w-full bg-surface-container-highest border-none rounded-md px-4 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="example@neverno.in" type="email" autocomplete="email" required/>
    </div>
  </div>

  <!-- Password Field -->
  <div class="group" id="passwordGroup">
    <div class="flex justify-between items-center mb-2">
      <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant group-focus-within:text-primary transition-colors">Password</label>
      <a href="forgot-password.html" class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60 hover:text-white transition-all active:scale-95 cursor-pointer">Forgot?</a>
    </div>
    <div class="relative">
      <input class="w-full bg-surface-container-highest border-none rounded-md px-4 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="••••••••" type="password" required id="authPassword"/>
      <button class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors" type="button" onclick="const p = document.getElementById('authPassword'); const icon = this.querySelector('span'); if(p.type === 'password') { p.type = 'text'; icon.textContent = 'visibility_off'; } else { p.type = 'password'; icon.textContent = 'visibility'; }">
        <span class="material-symbols-outlined text-xl">visibility</span>
      </button>
    </div>
  </div>

  <!-- OTP Code Field (Hidden until Email Verified) -->
  <div class="group" id="otpSection" style="display:none">
    <div class="flex justify-between items-center mb-2">
      <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant group-focus-within:text-primary transition-colors">6-Digit Code</label>
      <a onclick="resetFlow()" class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60 hover:text-white transition-all cursor-pointer">Change Email</a>
    </div>
    <div class="relative">
      <input class="w-full bg-surface-container-highest border-none rounded-md px-4 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="000 000" type="text" maxlength="6" id="otpCode" autoComplete="off"/>
    </div>
    <p id="otpHelpText" class="text-[10px] text-primary/60 mt-3 font-medium tracking-wide">Enter the code sent to your inbox.</p>
    
    <!-- Remember Me Checkbox -->
    <div class="mt-4 flex items-center gap-3 group/check cursor-pointer select-none" onclick="const c = document.getElementById('rememberMe'); c.checked = !c.checked;">
      <div class="relative flex items-center justify-center">
        <input type="checkbox" id="rememberMe" class="peer appearance-none w-4 h-4 rounded border border-on-surface-variant/30 bg-surface-container-highest checked:bg-primary checked:border-primary transition-all cursor-pointer"/>
        <span class="material-symbols-outlined absolute text-[10px] text-on-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">check</span>
      </div>
      <label class="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/60 group-hover/check:text-on-surface transition-colors cursor-pointer">Remember this device for 30 days</label>
    </div>
  </div>
</div>

<!-- Action -->
<div class="pt-4 space-y-6">
  <button id="authSubmitBtn" class="w-full cta-gradient text-on-secondary-container font-headline font-bold py-4 rounded-md shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2" type="submit">
    <span class="btn-text" id="btnLabel">Send OTP Code</span>
    <span class="btn-text material-symbols-outlined text-lg" data-icon="arrow_forward">arrow_forward</span>
  </button>
  
  <div class="flex justify-center login-only">
    <a class="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" onclick="handleSwitch('signup')">
      Don't have an account? <span class="text-secondary font-bold">Join NQR</span>
    </a>
  </div>
  <div class="flex justify-center signup-only">
    <a class="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" onclick="handleSwitch('login')">
      Already have an account? <span class="text-secondary font-bold">Sign In</span>
    </a>
  </div>
  
  <div class="flex justify-center pt-2">
    <a href="index.html" class="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 hover:text-white transition-all hover:scale-105">
      <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'wght' 600;">arrow_back</span>
      Return Home
    </a>
  </div>
</div>
</form>

</div>
</section>
</main>
<!-- Footer -->
<footer class="bg-[#131313] w-full py-8 border-t border-[#e5e2e1]/10">
<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 gap-4">
  <div style="display:flex; align-items:center; gap:0.5rem;">
    <div style="width:5px;height:5px;border-radius:50%;background:#D90429;box-shadow:0 0 5px rgba(217,4,41,0.7);"></div>
    <span class="font-inter text-xs uppercase tracking-widest text-[#e5e2e1]/30">© 2026 NQR · All rights reserved by NEVERNO.</span>
  </div>
  <div class="flex gap-8">
    <a class="font-inter text-xs uppercase tracking-widest text-[#e5e2e1]/30 hover:text-[#e5e2e1] transition-all hover:translate-x-1" href="privacy-policy.html">Privacy Policy</a>
    <a class="font-inter text-xs uppercase tracking-widest text-[#e5e2e1]/30 hover:text-[#e5e2e1] transition-all hover:translate-x-1" href="terms-of-service.html">Terms of Service</a>
    <a class="font-inter text-xs uppercase tracking-widest text-[#e5e2e1]/30 hover:text-[#e5e2e1] transition-all hover:translate-x-1" href="help-center.html">Help Center</a>
  </div>
</div>
</footer>

<script>
const overlay = document.getElementById('swipeOverlay');
const formContent = document.getElementById('formContent');
const body = document.body;

let currentStep = 'EMAIL'; // EMAIL -> OTP
let savedPassword = '';

function handleSwitch(mode) {
  overlay.classList.add('is-active');
  formContent.classList.add('is-fading');
  
  setTimeout(() => {
    body.setAttribute('data-mode', mode);
    resetFlow();
  }, 400);

  setTimeout(() => {
    formContent.classList.remove('is-fading');
  }, 500);

  setTimeout(() => {
    overlay.classList.remove('is-active');
  }, 800);
}

function resetFlow() {
  currentStep = 'EMAIL';
  const mode = body.getAttribute('data-mode');
  
  document.getElementById('emailGroup').style.display = 'block';
  document.getElementById('passwordGroup').style.display = 'block';
  document.getElementById('otpSection').style.display = 'none';
  
  const nameGroup = document.getElementById('fullNameGroup');
  if (nameGroup) {
     nameGroup.style.display = (mode === 'signup') ? 'block' : 'none';
  }

  // Reset checkbox
  const rem = document.getElementById('rememberMe');
  if (rem) rem.checked = false;

  document.getElementById('btnLabel').textContent = 'Send OTP Code';
}

async function handleAuthSubmit(e, form) {
  e.preventDefault();
  const errorEl  = document.getElementById('authError');
  const errorMsg = document.getElementById('authErrorMsg');
  const submitBtn = document.getElementById('authSubmitBtn');
  const btnLabel = document.getElementById('btnLabel');

  errorEl.classList.remove('visible');

  const email = form.querySelector('input[type=email]').value.trim().toLowerCase();
  
  if (currentStep === 'EMAIL') {
    const password = document.getElementById('authPassword').value;

    if (!email || !password) {
      errorMsg.textContent = 'Please fill in all fields.';
      errorEl.classList.add('visible');
      return;
    }



    // ── Domain guard (Strict @neverno.in restriction) ──
    const lowerEmail = email.toLowerCase().trim();
    if (!lowerEmail.endsWith('@neverno.in')) {
      errorMsg.textContent = 'Access restricted to @neverno.in accounts.';
      errorEl.classList.add('visible');
      return;
    }

    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;

    try {
      const mode = body.getAttribute('data-mode');
      const payload = { email, password };
      
      if (mode === 'signup') {
         const nameInput = document.getElementById('authName');
         payload.fullName = nameInput ? nameInput.value.trim() : 'User';
      }

      savedPassword = payload.password; // Store for second step
      const res = await window.API.requestOtp(payload.email, payload.password, mode);
      // Success! Transition to OTP step
      currentStep = 'OTP';
      document.getElementById('emailGroup').style.display = 'none';
      document.getElementById('passwordGroup').style.display = 'none';
      if (document.getElementById('fullNameGroup')) {
        document.getElementById('fullNameGroup').style.display = 'none';
      }
      document.getElementById('otpSection').style.display = 'block';
      document.getElementById('otpHelpText').textContent = 'Enter the code sent to your ' + email + ' inbox.';
      btnLabel.textContent = 'Verify & Sign In';
      
      if(res.debug_otp) {
        console.log("%c[DEBUG]%c OTP Code is: " + res.debug_otp, "color:red;font-weight:bold", "color:inherit");
      }
    } catch (err) {
      errorMsg.textContent = err.message || 'Failed to send OTP. Please try again.';
      errorEl.classList.add('visible');
    } finally {
      submitBtn.classList.remove('btn-loading');
      submitBtn.disabled = false;
    }
  } else {
    // ── VERIFY OTP ──
    const otpCode = document.getElementById('otpCode').value.trim();
    if (!otpCode || otpCode.length !== 6) {
      errorMsg.textContent = 'Please enter the 6-digit code.';
      errorEl.classList.add('visible');
      return;
    }

    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;

    try {
      const mode = body.getAttribute('data-mode');
      if (mode === 'signup') {
        const nameInput = document.getElementById('authName');
        const fullName  = nameInput ? nameInput.value.trim() : 'User';
        const userData = {
          email,
          firstName: fullName.split(' ')[0] || 'User',
          lastName: fullName.split(' ').slice(1).join(' ') || '',
          password: savedPassword
        };
        await window.API.signup(userData, otpCode);
      } else {
        // Note: The current Lambda login uses password, 
        // but to keep the OTP flow we verify password here.
        await window.API.login(email, savedPassword);
      }
      window.location.href = 'app-generator.html';
    } catch (err) {
      errorMsg.textContent = 'Invalid or expired code. Please try again.';
      errorEl.classList.add('visible');
    } finally {
      submitBtn.classList.remove('btn-loading');
      submitBtn.disabled = false;
    }
  }
}
</script>

<!-- GSAP stagger entrance -->
<script>
(function initEntrance() {
  // Mark elements with gsap-enter before they render
  const targets = [
    '#formContent .space-y-4',   // heading block
    '#authError',                 // error box (hidden but positioned)
    '#formContent .space-y-6 > *', // each field group
    '#authSubmitBtn',
    '#formContent .pt-4 > :not(#authSubmitBtn)',
  ];

  // Actually use a simpler, flat selector approach
  const els = document.querySelectorAll([
    '#formContent h2',
    '#formContent p.font-body',
    '#formContent .group',
    '#authSubmitBtn',
    '#formContent a.font-label',
    '.editorial-stats',
    '.stat-block'
  ].join(','));

  if (typeof gsap === 'undefined') return; // GSAP failsafe

  // Set initial state
  gsap.set(els, { opacity: 0, y: 20 });

  // Editorial side stagger
  const editorial = document.querySelectorAll('.qr-grid-deco, .stat-block, .editorial-stats');
  gsap.set(editorial, { opacity: 0, y: 15 });

  // Timeline
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.to(document.querySelectorAll('#formContent h2, #formContent p.font-body'), {
    opacity: 1, y: 0, duration: 0.55, stagger: 0.1, delay: 0.15
  })
  .to(document.querySelectorAll('#formContent .group'), {
    opacity: 1, y: 0, duration: 0.5, stagger: 0.08
  }, '-=0.2')
  .to('#authSubmitBtn', {
    opacity: 1, y: 0, duration: 0.45
  }, '-=0.15')
  .to(document.querySelectorAll('#formContent a.font-label'), {
    opacity: 1, y: 0, duration: 0.4, stagger: 0.06
  }, '-=0.2')
  .to(editorial, {
    opacity: 1, y: 0, duration: 0.6, stagger: 0.1
  }, 0.1);
})();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'user-login.html'), html, { encoding: 'utf8', flag: 'w' });
console.log('Login page updated with new UI template!');
