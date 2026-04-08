const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>NQR | Login</title>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script src="config.js"></script>
<script src="backend.js"></script>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
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
.material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.editorial-gradient {
    background: linear-gradient(135deg, #080E22 0%, #05070A 100%);
}
.cta-gradient {
    background: linear-gradient(to right, #d90429, #68000e);
}
.glass-panel {
    background: rgba(53, 53, 52, 0.4);
    backdrop-filter: blur(20px);
}

/* Scrollbar Hiding */
*, html, body { box-sizing: border-box; }
::-webkit-scrollbar { display: none; }
* { -ms-overflow-style: none; scrollbar-width: none; }
html, body { overflow-x: hidden; margin: 0; padding: 0; }

/* Enhanced Swipe Animation */
.swipe-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; transform: translateX(-120%);
  background: linear-gradient(90deg, transparent 0%, rgba(217, 4, 41, 0.8) 40%, rgba(217, 4, 41, 1) 50%, rgba(217, 4, 41, 0.8) 60%, transparent 100%);
  z-index: 9999; pointer-events: none; backdrop-filter: blur(8px);
}
.swipe-overlay.is-active { animation: swipe 0.8s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
@keyframes swipe { 0% { transform: translateX(-120%) skewX(-15deg); } 50% { transform: translateX(0%) skewX(-5deg); } 100% { transform: translateX(120%) skewX(-15deg); } }

.form-content { transition: opacity 0.4s ease, transform 0.4s ease; }
.form-content.is-fading { opacity: 0; transform: translateY(10px); }

/* Mode visibility toggles */
[data-mode]:not([data-mode="login"]) .login-only,
[data-mode]:not([data-mode="signup"]) .signup-only,
[data-mode]:not([data-mode="forgot"]) .forgot-only,
[data-mode]:not([data-mode="otp"]) .otp-only { display: none; }

[data-mode="otp"] .hide-on-otp { display: none; }
[data-mode="forgot"] .hide-on-forgot { display: none; }

</style>
</head>
<body class="bg-background text-on-background font-body selection:bg-secondary-container selection:text-on-secondary-container" data-mode="login">
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
<div class="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-container/40 via-transparent to-transparent"></div>
</div>
<div class="relative z-10 space-y-6">
  <h1 class="font-headline text-7xl font-extrabold tracking-tighter text-on-surface leading-[0.9]">
    The <br/>Editorial <br/><span class="text-secondary-container">Standard.</span>
  </h1>
  <p class="font-body text-lg text-on-surface-variant max-w-md opacity-80 leading-relaxed">
    Elevating digital sharing through curated QR editorial experiences. Secure, professional, and uncompromising.
  </p>
</div>
<!-- Background Texture Decal -->
<div class="absolute -right-20 -bottom-20 opacity-5">
  <span class="material-symbols-outlined text-[40rem] select-none" style="font-variation-settings: 'wght' 100;">qr_code_2</span>
</div>
</section>

<!-- Login Container -->
<section class="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-24">
<div class="w-full max-w-md space-y-12 form-content" id="formContent">
<!-- Header -->
<div class="space-y-4">
  <h2 class="font-headline text-4xl font-bold tracking-tight text-on-surface login-only">Welcome back</h2>
  <h2 class="font-headline text-4xl font-bold tracking-tight text-on-surface signup-only">Join NQR</h2>
  <h2 class="font-headline text-4xl font-bold tracking-tight text-on-surface forgot-only">Reset Password</h2>
  <h2 class="font-headline text-4xl font-bold tracking-tight text-on-surface otp-only">Verify Email</h2>
  
  <p class="font-body text-on-surface-variant text-base opacity-70 login-only">Sign in to start generating and sharing QRs.</p>
  <p class="font-body text-on-surface-variant text-base opacity-70 signup-only">Create an account to save and track your QRs.</p>
  <p class="font-body text-on-surface-variant text-base opacity-70 forgot-only">Enter your email and we'll send a code to reset it.</p>
  <p class="font-body text-on-surface-variant text-base opacity-70 otp-only" id="otpSubtext">We sent a 6-digit code to your email.</p>
</div>

<div id="authError" style="color: #ffb4ab; background: rgba(147, 0, 10, 0.2); padding: 12px; border-radius: 8px; margin-bottom: 24px; display: none; text-align: center; border: 1px solid rgba(147, 0, 10, 0.5);"></div>
<div id="authSuccess" style="color: #ffdad6; background: rgba(217, 4, 41, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 24px; display: none; text-align: center; border: 1px solid rgba(217, 4, 41, 0.4);"></div>

<!-- Form -->
<form class="space-y-6" onsubmit="handleAuthSubmit(event, this)">
<div class="space-y-6">

  <!-- Full Name Field (Signup Only) -->
  <div class="group signup-only hide-on-otp hide-on-forgot">
    <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant block mb-2 group-focus-within:text-primary transition-colors">Full Name</label>
    <div class="relative">
      <input class="w-full bg-surface-container-highest border-none rounded-md px-4 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="Jane Doe" type="text" id="authName"/>
    </div>
  </div>

  <!-- Email Field -->
  <div class="group hide-on-otp">
    <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant block mb-2 group-focus-within:text-primary transition-colors">Email Address</label>
    <div class="relative">
      <input class="w-full bg-surface-container-highest border-none rounded-md px-4 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none" placeholder="editor@nqr.io" type="email" id="authEmail"/>
    </div>
  </div>

  <!-- OTP Field (OTP Only) -->
  <div class="group otp-only">
    <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant block mb-2 group-focus-within:text-primary transition-colors">Verification Code</label>
    <div class="relative">
      <input class="w-full bg-surface-container-highest border-none rounded-md px-4 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none text-center font-mono tracking-[0.5em] text-xl" placeholder="••••••" type="text" maxlength="6" id="authOtp"/>
    </div>
  </div>

  <!-- Password Field -->
  <div class="group hide-on-forgot hide-on-otp" id="passwordGroup">
    <div class="flex justify-between items-center mb-2">
      <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant group-focus-within:text-primary transition-colors login-only">Password</label>
      <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant group-focus-within:text-primary transition-colors signup-only">Create Password</label>
      <a class="login-only font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60 hover:text-white transition-all active:scale-95 cursor-pointer" onclick="handleSwitch('forgot')">Forgot?</a>
    </div>
    <div class="relative">
      <input class="w-full bg-surface-container-highest border-none rounded-md px-4 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none auth-pw" placeholder="••••••••" type="password" id="authPassword"/>
      <button class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors" type="button" onclick="const p = document.getElementById('authPassword'); const icon = this.querySelector('span'); if(p.type === 'password') { p.type = 'text'; icon.textContent = 'visibility_off'; } else { p.type = 'password'; icon.textContent = 'visibility'; }">
        <span class="material-symbols-outlined text-xl">visibility</span>
      </button>
    </div>
  </div>
  
  <div class="group otp-only" id="newPasswordGroup" style="display: none;">
    <div class="flex justify-between items-center mb-2">
      <label class="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant group-focus-within:text-primary transition-colors">New Password</label>
    </div>
    <div class="relative">
      <input class="w-full bg-surface-container-highest border-none rounded-md px-4 py-4 text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-container transition-all outline-none auth-pw" placeholder="••••••••" type="password" id="authNewPassword"/>
    </div>
  </div>

</div>

<!-- Action -->
<div class="pt-4 space-y-6">
  <button class="w-full cta-gradient text-on-secondary-container font-headline font-bold py-4 rounded-md shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2" type="submit">
    <span class="login-only">Sign In</span>
    <span class="signup-only">Verify Email</span>
    <span class="forgot-only">Send Code</span>
    <span class="otp-only" id="otpBtnText">Confirm</span>
    <span class="material-symbols-outlined text-lg" data-icon="arrow_forward">arrow_forward</span>
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
  <div class="flex justify-center forgot-only">
    <a class="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" onclick="handleSwitch('login')">
      Back to <span class="text-secondary font-bold">Sign In</span>
    </a>
  </div>
  <div class="flex justify-center otp-only">
    <a class="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" onclick="handleSwitch('login')">
      Cancel & Return to <span class="text-secondary font-bold">Sign In</span>
    </a>
  </div>
  
</div>
</form>

</div>
</section>
</main>
<!-- Footer -->
<footer class="bg-[#131313] w-full py-12 border-t border-[#e5e2e1]/10">
<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 gap-6">
  <div class="font-inter text-xs uppercase tracking-widest text-[#e5e2e1]/40">
      © 2026 NQR. All rights reserved by NEVERNO.
  </div>
  <div class="flex gap-8">
    <a class="font-inter text-xs uppercase tracking-widest text-[#e5e2e1]/40 hover:text-[#e5e2e1] transition-opacity" href="privacy-policy.html">Privacy Policy</a>
    <a class="font-inter text-xs uppercase tracking-widest text-[#e5e2e1]/40 hover:text-[#e5e2e1] transition-opacity" href="terms-of-service.html">Terms of Service</a>
    <a class="font-inter text-xs uppercase tracking-widest text-[#e5e2e1]/40 hover:text-[#e5e2e1] transition-opacity" href="help-center.html">Help Center</a>
  </div>
</div>
</footer>

<script>
const overlay = document.getElementById('swipeOverlay');
const formContent = document.getElementById('formContent');
const body = document.body;

let activeFlow = null; // 'signup' or 'reset' when in OTP mode

function handleSwitch(mode) {
  overlay.classList.add('is-active');
  formContent.classList.add('is-fading');
  
  if (mode !== 'otp') {
    document.getElementById('newPasswordGroup').style.display = 'none';
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authSuccess').style.display = 'none';
  }

  setTimeout(() => {
    body.setAttribute('data-mode', mode);
  }, 400);

  setTimeout(() => {
    formContent.classList.remove('is-fading');
  }, 500);

  setTimeout(() => {
    overlay.classList.remove('is-active');
  }, 800);
}

function showOtpScreen(flow) {
  activeFlow = flow;
  document.getElementById('otpSubtext').innerText = \`We sent a 6-digit code to \${document.getElementById('authEmail').value}\`;
  
  if (flow === 'reset') {
    document.getElementById('newPasswordGroup').style.display = 'block';
    document.getElementById('otpBtnText').innerText = 'Reset Password';
  } else {
    document.getElementById('newPasswordGroup').style.display = 'none';
    document.getElementById('otpBtnText').innerText = 'Create Account';
  }
  
  handleSwitch('otp');
}

async function handleAuthSubmit(e, form) {
  e.preventDefault();
  const errorEl = document.getElementById('authError');
  const successEl = document.getElementById('authSuccess');
  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  const email = document.getElementById('authEmail').value.trim().toLowerCase();
  const password = document.getElementById('authPassword').value;
  const otp = document.getElementById('authOtp').value.trim();
  const mode = document.body.getAttribute('data-mode');

  if (!email.endsWith('@neverno.in') && mode !== 'otp') {
    if (mode === 'signup' || mode === 'forgot') {
      errorEl.innerHTML = 'Account operations are restricted to @neverno.in domains only.';
    } else {
      errorEl.innerHTML = 'The login email ID or password you entered is incorrect.';
    }
    errorEl.style.display = 'block';
    return;
  }

  if (mode === 'login' && (!email || !password)) {
    errorEl.innerHTML = 'Email and password are required.';
    errorEl.style.display = 'block'; return;
  }

  const submitBtn = form.querySelector('button[type=submit]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Processing...';
  submitBtn.disabled = true;

  try {
    if (mode === 'login') {
      await window.API.login(email, password);
      window.location.href = 'app-generator.html';
      
    } else if (mode === 'signup') {
      // Step 1: Request OTP for Signup
      if(!password) throw new Error('Password is required');
      await window.API.requestOtp(email, 'signup');
      successEl.innerHTML = 'Code sent! Check your inbox.';
      successEl.style.display = 'block';
      showOtpScreen('signup');
      
    } else if (mode === 'forgot') {
      // Step 1: Request OTP for Reset
      await window.API.requestOtp(email, 'reset');
      successEl.innerHTML = 'Reset code sent! Check your inbox.';
      successEl.style.display = 'block';
      showOtpScreen('reset');
      
    } else if (mode === 'otp') {
      // Step 2: Verify OTP and finalize
      if (!otp || otp.length !== 6) throw new Error('Enter a valid 6-digit code');
      
      if (activeFlow === 'signup') {
        const fullName = (document.getElementById('authName').value || '').trim() || 'User';
        const nameParts = fullName.split(' ');
        await window.API.signup({ 
          email, 
          password, 
          firstName: nameParts[0], 
          lastName: nameParts.slice(1).join(' ')
        }, otp);
        window.location.href = 'app-generator.html';
        
      } else if (activeFlow === 'reset') {
        const newPassword = document.getElementById('authNewPassword').value;
        if (!newPassword) throw new Error('Enter a new password');
        await window.API.resetPassword(email, otp, newPassword);
        
        successEl.innerHTML = 'Password reset successfully! You can now log in.';
        successEl.style.display = 'block';
        handleSwitch('login');
      }
    }
  } catch (err) {
    if (mode === 'login') {
      errorEl.innerHTML = 'The login email ID or password you entered is incorrect.';
    } else {
      errorEl.innerHTML = err.message || 'Operation failed. Please try again.';
    }
    errorEl.style.display = 'block';
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}
</script>
</body>
</html>\`;

fs.writeFileSync(path.join(__dirname, 'user-login.html'), html, { encoding: 'utf8', flag: 'w' });
console.log('Login page updated with new UI template!');
