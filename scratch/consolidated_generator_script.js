/* Consolidated app-generator.html script */

// ── STATE ──────────────────────────────────────────────────
let qrCode = null;
let currentContent = 'https://neverq.in';
let currentQrId = null;
let userSettings = { brandName: '', customDomain: '', subdomainType: 'managed', managedSubdomain: '' };

let currentOptions = {
    width: 1000, height: 1000, margin: 40,
    data: "https://neverq.in", image: "",
    dotsOptions: { color: "#0F1636", type: "square" },
    backgroundOptions: { color: "#ffffff" },
    cornersSquareOptions: { color: "#0F1636", type: "square" },
    cornersDotOptions: { color: "#0F1636", type: "square" },
    qrOptions: { errorCorrectionLevel: 'H' },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 10 }
};

// ── DOM ELEMENTS ───────────────────────────────────────────
const qrModal       = document.getElementById('qrModal');
const modalQrWrap   = document.getElementById('modalQrWrap');
const generateBtn   = document.getElementById('generateBtn');
const closeModal    = document.getElementById('closeModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const copyLinkBtn   = document.getElementById('copyLinkBtn');

const tabBtns       = document.querySelectorAll('.tab-trigger');
const tabContents   = document.querySelectorAll('.gen-form-content');

const linkInput     = document.getElementById('linkInput');
const linkName      = document.getElementById('linkName');
const textInput     = document.getElementById('textInput');
const textName      = document.getElementById('textName');
const payeeInput    = document.getElementById('payeeInput');
const amountInput   = document.getElementById('amountInput');
const noteInput     = document.getElementById('noteInput');
const currencyInput = document.getElementById('currencyInput');
const paymentName   = document.getElementById('paymentName');

const qrColorInput  = document.getElementById('qrColorInput');
const bgColorInput  = document.getElementById('bgColorInput');
const eyeColorInput = document.getElementById('eyeColorInput');
const logoInput     = document.getElementById('logoInput');
const removeLogoBtn = document.getElementById('removeLogoBtn');
const patternBtns   = document.querySelectorAll('.gen-pattern-btn');

// ── INITIALIZATION ─────────────────────────────────────────
function initQR() {
    if (!window.QRCodeStyling) return;
    qrCode = new QRCodeStyling(currentOptions);
    // Render the initial watermark preview if needed
    updatePreview(false);
}

// ── CORE LOGIC ──────────────────────────────────────────────
function updatePreview(toModal = false) {
    if (!qrCode) return;
    // Set data based on current context
    currentOptions.data = currentContent || 'https://neverq.in';
    
    if (toModal) {
        // High-fidelity rendering for modal
        const previewOptions = { ...currentOptions, width: 300, height: 300 };
        qrCode.update(previewOptions);
        modalQrWrap.innerHTML = '';
        qrCode.append(modalQrWrap);
    } else {
        // Small preview on the side pane (if any)
        const sidePreview = document.getElementById('livePreviewQr');
        if (sidePreview) {
            const sideOptions = { ...currentOptions, width: 200, height: 200 };
            qrCode.update(sideOptions);
            sidePreview.innerHTML = '';
            qrCode.append(sidePreview);
        }
    }
}

async function handleGenerateClick() {
    const activeTab = document.querySelector('.tab-trigger.active');
    const type = activeTab ? activeTab.dataset.target.replace('tab-', '') : 'link';

    let name = '';
    if (type === 'link') name = linkName?.value;
    else if (type === 'text') name = textName?.value;
    else if (type === 'payment') name = paymentName?.value;
    else if (type === 'contact') name = (document.getElementById('vcardFirstName')?.value || '') + ' ' + (document.getElementById('vcardLastName')?.value || '');

    const oldHtml = generateBtn.innerHTML;
    generateBtn.innerHTML = `<span class="animate-spin material-symbols-outlined">sync</span> Generating...`;
    generateBtn.disabled = true;

    try {
        const smartOpts = await buildSmartOptions();
        const qrData = {
            name: (name || `${type.toUpperCase()} QR`).trim(),
            type: type,
            content: currentContent,
            options: currentOptions,
            smart: smartOpts
        };

        const result = await window.API.saveQR(qrData);
        currentQrId = result.qrId;

        // Domain Logic
        let shortBase = 'neverq.in/go/';
        if (userSettings.subdomainType === 'managed' && userSettings.managedSubdomain) {
            shortBase = `${userSettings.managedSubdomain}.neverq.in/go/`;
        } else if (userSettings.subdomainType === 'custom' && userSettings.customDomain) {
            shortBase = `${userSettings.customDomain}/go/`;
        }

        const finalShortUrl = `https://${shortBase}${result.qrId}`;
        const shortLinkInput = document.getElementById('modalShortLink');
        if (shortLinkInput) shortLinkInput.value = finalShortUrl;

        updatePreview(true);
        qrModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (activeTab.dataset.target === 'tab-settings') loadHistory();

    } catch (err) {
        alert('Generation failed: ' + err.message);
    } finally {
        generateBtn.innerHTML = oldHtml;
        generateBtn.disabled = false;
    }
}

// ── HELPERS ────────────────────────────────────────────────
function buildVCard() {
    const fn = (document.getElementById('vcardFirstName')?.value || '').trim();
    const ln = (document.getElementById('vcardLastName')?.value || '').trim();
    const org = (document.getElementById('vcardCompany')?.value || '').trim();
    const title = (document.getElementById('vcardTitle')?.value || '').trim();
    const tel = (document.getElementById('vcardPhone')?.value || '').trim();
    const email = (document.getElementById('vcardEmail')?.value || '').trim();

    let v = 'BEGIN:VCARD\nVERSION:3.0\n';
    if (fn || ln) v += `N:${ln};${fn}\nFN:${fn} ${ln}\n`;
    if (org) v += `ORG:${org}\n`;
    if (title) v += `TITLE:${title}\n`;
    if (tel) v += `TEL;TYPE=CELL:${tel}\n`;
    if (email) v += `EMAIL:${email}\n`;
    v += 'END:VCARD';
    return v;
}

function updatePaymentPreview() {
    const payee = (payeeInput?.value || '').trim();
    const amount = (amountInput?.value || '').trim();
    const note = (noteInput?.value || '').trim();
    const curr = (currencyInput?.value || 'INR').toUpperCase();

    if (!payee) {
        currentContent = 'upi://pay?pa=yourname@upi&pn=NQR&cu=INR';
        return;
    }

    if (curr === 'INR') {
        let upi = `upi://pay?pa=${encodeURIComponent(payee)}&pn=${encodeURIComponent(payee)}&cu=INR`;
        if (amount) upi += `&am=${encodeURIComponent(amount)}`;
        if (note) upi += `&tn=${encodeURIComponent(note)}`;
        currentContent = upi;
    } else {
        currentContent = `${curr.toLowerCase()}:${payee}?amount=${amount}&note=${encodeURIComponent(note)}`;
    }
}

async function buildSmartOptions() {
    const pwTog = document.getElementById('passwordProtectToggle')?.checked;
    const pin = pwTog ? document.getElementById('filePinInput')?.value : null;
    const expiry = document.getElementById('fileExpireSelect')?.value || 'never';
    const rules = Array.from(document.querySelectorAll('.rule-row')).map(row => ({
        type: row.querySelector('.rule-type').value,
        value: row.querySelector('.rule-value').value.trim(),
        url: row.querySelector('.rule-url').value.trim()
    })).filter(r => r.value && r.url);

    const fb = (document.getElementById('fbPixelId')?.value || '').trim();
    const gtm = (document.getElementById('gtmId')?.value || '').trim();
    const lcTog = document.getElementById('leadCaptureToggle')?.checked;
    const lcFields = [];
    if (document.getElementById('lcName')?.checked) lcFields.push('name');
    if (document.getElementById('lcEmail')?.checked) lcFields.push('email');
    if (document.getElementById('lcPhone')?.checked) lcFields.push('phone');
    const lcHead = (document.getElementById('leadHeading')?.value || '').trim();

    return {
        password: pin,
        expiresAt: expiry,
        rules: rules.length ? rules : undefined,
        retargeting: (fb || gtm) ? { fbPixelId: fb || null, gtmId: gtm || null } : undefined,
        leadCapture: lcTog ? { enabled: true, fields: lcFields, heading: lcHead || undefined } : undefined
    };
}

// ── EVENT LISTENERS ────────────────────────────────────────
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabContents.forEach(tc => tc.classList.remove('active'));
        const activeContent = document.getElementById(target);
        if (activeContent) activeContent.classList.add('active');

        // Toggle sections
        const isLink = target === 'tab-link';
        const isFile = target === 'tab-file';
        const isSettings = target === 'tab-settings';

        document.getElementById('smartRulesSection').style.display  = isLink ? 'block' : 'none';
        document.getElementById('retargetingSection').style.display = isLink ? 'block' : 'none';
        document.getElementById('sharedSecuritySettings').style.display = (isLink || isFile) ? 'block' : 'none';

        if (isLink) currentContent = linkInput.value || 'https://neverq.in';
        else if (target === 'tab-text') currentContent = textInput.value || '';
        else if (target === 'tab-contact') currentContent = buildVCard();
        else if (target === 'tab-payment') updatePaymentPreview();
        else if (isFile) currentContent = 'https://neverq.in/dl/file-link';
        else if (isSettings) loadHistory();

        updatePreview(false);
    });
});

[linkInput, textInput, payeeInput, amountInput, noteInput, currencyInput].forEach(el => {
    if (el) el.addEventListener('input', () => {
        const activeTab = document.querySelector('.tab-trigger.active');
        const target = activeTab?.dataset.target;
        if (target === 'tab-link') currentContent = linkInput.value;
        else if (target === 'tab-text') currentContent = textInput.value;
        else if (target === 'tab-payment') updatePaymentPreview();
        else if (target === 'tab-contact') currentContent = buildVCard();
        updatePreview(false);
    });
});

qrColorInput?.addEventListener('input', (e)   => { currentOptions.dotsOptions.color = e.target.value; updatePreview(false); });
bgColorInput?.addEventListener('input', (e)   => { currentOptions.backgroundOptions.color = e.target.value; updatePreview(false); });
eyeColorInput?.addEventListener('input', (e)  => { currentOptions.cornersSquareOptions.color = e.target.value; currentOptions.cornersDotOptions.color = e.target.value; updatePreview(false); });

generateBtn.onclick = handleGenerateClick;

closeModal?.addEventListener('click', () => { qrModal.classList.remove('active'); document.body.style.overflow = ''; });
modalBackdrop?.addEventListener('click', () => { qrModal.classList.remove('active'); document.body.style.overflow = ''; });
copyLinkBtn?.addEventListener('click', () => {
    const input = document.getElementById('modalShortLink');
    input.select(); document.execCommand('copy'); alert('Link copied!');
});

// Pattern Logic
patternBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        patternBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pat = btn.dataset.pattern;
        currentOptions.dotsOptions.type = pat;
        if (pat === 'rounded' || pat === 'dots') {
            currentOptions.cornersSquareOptions.type = 'extra-rounded';
            currentOptions.cornersDotOptions.type = 'dot';
        } else if (pat === 'classy-fluid') {
            currentOptions.cornersSquareOptions.type = 'extra-rounded';
            currentOptions.cornersDotOptions.type = 'square';
        } else {
            currentOptions.cornersSquareOptions.type = 'square';
            currentOptions.cornersDotOptions.type = 'square';
        }
        updatePreview(false);
    });
});

// Logo Logic
logoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentOptions.image = ev.target.result;
            const preview = document.getElementById('logoPreview');
            preview.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-contain"/>`;
            removeLogoBtn.style.display = 'inline-flex';
            updatePreview(false);
        };
        reader.readAsDataURL(file);
    }
});
removeLogoBtn?.addEventListener('click', () => {
    currentOptions.image = ""; logoInput.value = ""; removeLogoBtn.style.display = 'none';
    document.getElementById('logoPreview').innerHTML = '<span class="material-symbols-outlined text-white/10 text-3xl">image</span>';
    updatePreview(false);
});

// Toggles
document.getElementById('ctaFrameToggle')?.addEventListener('change', (e) => {
    document.getElementById('ctaFrameWrap').style.display = e.target.checked ? 'block' : 'none';
});
document.getElementById('leadCaptureToggle')?.addEventListener('change', (e) => {
    document.getElementById('leadCaptureWrap').style.display = e.target.checked ? 'block' : 'none';
});
document.getElementById('passwordProtectToggle')?.addEventListener('change', (e) => {
  document.getElementById('pinInputWrap').style.display = e.target.checked ? 'block' : 'none';
});

// Rule management
document.getElementById('addRuleBtn')?.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'rule-row flex gap-2 mb-2';
    row.innerHTML = `
      <select class="rule-type premium-input px-2 py-2 text-xs">
        <option value="location">📍 Location</option>
        <option value="language">🌐 Language</option>
        <option value="time">⏰ Time</option>
      </select>
      <input class="rule-value premium-input flex-1 px-4 py-2 text-xs" type="text" placeholder="Value"/>
      <input class="rule-url premium-input flex-1 px-4 py-2 text-xs" type="url" placeholder="URL"/>
      <button class="text-white/20 hover:text-primary transition-colors" onclick="this.parentElement.remove()">✕</button>
    `;
    document.getElementById('rulesList').appendChild(row);
});

// ── SETTINGS & HISTORY ──────────────────────────────────────
async function loadUserSettings() {
    try {
        const settings = await window.API.getUserSettings();
        if (settings) {
            userSettings = { ...userSettings, ...settings };
            const wm = document.getElementById('uiWatermark');
            if (wm && settings.brandName) wm.textContent = settings.brandName.toUpperCase();
        }
    } catch (e) { console.warn('Settings load failed:', e); }
}

async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="py-12 text-center opacity-30">Loading...</td></tr>';
    try {
        const history = await window.API.getHistory();
        if (!history || history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-12 text-center opacity-30">No history found.</td></tr>';
            return;
        }
        tbody.innerHTML = history.reverse().map(qr => `
          <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <td class="px-6 py-4">
              <div class="font-bold">${qr.name || 'Untitled QR'}</div>
              <div class="text-[10px] opacity-30 uppercase">${new Date(qr.createdAt).toLocaleDateString()}</div>
            </td>
            <td class="px-6 py-4"><span class="px-2 py-0.5 rounded bg-white/5 text-[9px] uppercase font-bold">${qr.type}</span></td>
            <td class="px-6 py-4 font-mono text-primary text-[10px]">${qr.qrId}</td>
            <td class="px-6 py-4 text-center">
               <button class="p-2 hover:text-primary transition-colors" onclick="editQR('${qr.qrId}')"><span class="material-symbols-outlined text-lg">edit</span></button>
               <button class="p-2 hover:text-primary transition-colors" onclick="deleteHistoryQR('${qr.qrId}')"><span class="material-symbols-outlined text-lg">delete</span></button>
            </td>
          </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = `<tr><td colspan="4" class="py-12 text-center text-primary/50">Error loading history</td></tr>`; }
}

// ── DOWNLOAD LOGIC ──────────────────────────────────────────
async function downloadQR(extension) {
    if (!qrCode) return;
    const downloadOptions = { ...currentOptions, width: 1000, height: 1000 };
    qrCode.update(downloadOptions);

    const frameEnabled = document.getElementById('ctaFrameToggle')?.checked;
    const frameText    = document.getElementById('ctaFrameText')?.value  || 'Scan Me';
    const frameColor   = document.getElementById('ctaFrameColor')?.value || '#20306F';
    const watermarkTxt = (userSettings.brandName || 'Powered by NEVERNO').toUpperCase();
    
    const FRAME_PAD    = frameEnabled ? 60 : 0;
    const FRAME_FOOT   = frameEnabled ? 80 : 0;
    const WATERMARK_H  = 60;
    const TOTAL_H      = 1000 + (frameEnabled ? FRAME_FOOT : 0) + WATERMARK_H;
    const TOTAL_W      = 1000 + FRAME_PAD * 2;

    const blob = await qrCode.getRawData(extension === 'svg' ? 'svg' : 'png');
    
    if (extension === 'png' || extension === 'pdf') {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = TOTAL_W;
            canvas.height = TOTAL_H;
            ctx.fillStyle = currentOptions.backgroundOptions.color || '#ffffff';
            ctx.fillRect(0,0, canvas.width, canvas.height);

            if (frameEnabled) {
                ctx.fillStyle = frameColor;
                ctx.fillRect(0,0, TOTAL_W, TOTAL_H - WATERMARK_H);
                ctx.drawImage(img, FRAME_PAD, FRAME_PAD/2, 1000, 1000);
                ctx.fillStyle = '#ffffff';
                ctx.font = "bold 36px 'Manrope'";
                ctx.textAlign = 'center';
                ctx.fillText(frameText.toUpperCase(), TOTAL_W/2, 1000 + FRAME_PAD/2 + 30);
            } else {
                ctx.drawImage(img, 0, 0);
            }

            ctx.font = "bold 18px 'Inter'";
            ctx.fillStyle = currentOptions.dotsOptions.color;
            ctx.globalAlpha = 0.35;
            ctx.textAlign = 'center';
            ctx.fillText(watermarkTxt, TOTAL_W/2, TOTAL_H - 30);

            if (extension === 'pdf') {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`nqr-${Date.now()}.pdf`);
            } else {
                const link = document.createElement('a');
                link.download = `nqr-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
            updatePreview(true);
        };
    } else {
        // SVG Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `nqr-${Date.now()}.svg`;
        link.href = url;
        link.click();
    }
}

// ── START ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initQR();
    setTimeout(() => {
        loadUserSettings();
        // Handle initial hash
        const h = window.location.hash.substring(1);
        if (h === 'settings') document.querySelector('[data-target="tab-settings"]')?.click();
    }, 500);
});
