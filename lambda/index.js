const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const https = require('https');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sesClient = new SESClient({});

const USERS_TABLE  = process.env.USERS_TABLE  || 'NqrUsers';
const QRS_TABLE    = process.env.QRS_TABLE    || 'NqrQrs';
const OTPS_TABLE   = process.env.OTPS_TABLE   || 'NqrOtps';
const LEADS_TABLE  = process.env.LEADS_TABLE  || 'NqrLeads';
const SES_SENDER   = process.env.SES_SENDER   || 'support@neverno.in';

// ── Helpers ──────────────────────────────────────────────
function hashPassword(p) { return crypto.createHash('sha256').update(p).digest('hex'); }
function generateOTP()   { return Math.floor(100000 + Math.random() * 900000).toString(); }
function uid()           { return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; }

async function sendSESEmail(to, subject, html) {
  const params = {
    Destination: { ToAddresses: [to] },
    Message: { Body: { Html: { Charset: "UTF-8", Data: html } }, Subject: { Charset: "UTF-8", Data: subject } },
    Source: SES_SENDER
  };
  return sesClient.send(new SendEmailCommand(params));
}

// ── Smart Rules Evaluator ────────────────────────────────
function evaluateRules(rules = [], ctx = {}) {
  for (const rule of rules) {
    if (!rule.url) continue;
    let match = false;
    switch (rule.type) {
      case 'location': {
        const country = (ctx.country || '').toUpperCase();
        const val     = (rule.value || '').toUpperCase().trim();
        match = country === val;
        break;
      }
      case 'language': {
        const lang = (ctx.language || '').toLowerCase().split(',')[0].trim().split(';')[0].split('-')[0];
        const val  = (rule.value || '').toLowerCase().trim();
        match = lang === val;
        break;
      }
      case 'time': {
        // value format: "HH:MM-HH:MM" UTC
        const [start, end] = (rule.value || '').split('-');
        if (start && end) {
          const now = new Date();
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          const nowMins  = now.getUTCHours() * 60 + now.getUTCMinutes();
          const startM   = sh * 60 + sm;
          const endM     = eh * 60 + em;
          match = startM <= endM ? (nowMins >= startM && nowMins < endM) : (nowMins >= startM || nowMins < endM);
        }
        break;
      }
      case 'scan_count': {
        const threshold = parseInt(rule.value, 10) || 0;
        match = (ctx.scans || 0) >= threshold;
        break;
      }
      default: break;
    }
    if (match) return rule.url;
  }
  return null;
}

// ── Lead Capture HTML ────────────────────────────────────
function buildLeadCaptureHTML(qrId, leadCapture, finalUrl, retargeting) {
  const fields  = leadCapture.fields || ['name','email','phone'];
  const heading = leadCapture.heading || 'Before we continue…';
  const pixelScripts = buildPixelScripts(retargeting, false);
  const fieldsHtml = fields.map(f => {
    if (f === 'name')  return `<input type="text"  name="name"  placeholder="Your Name"         class="lc-input" required/>`;
    if (f === 'email') return `<input type="email" name="email" placeholder="Email Address"      class="lc-input" required/>`;
    if (f === 'phone') return `<input type="tel"   name="phone" placeholder="Phone Number"       class="lc-input"/>`;
    return '';
  }).join('\n');

  return `
<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Quick Form — NQR</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#131313;font-family:'Inter',sans-serif;color:#e5e2e1;padding:1rem}
  .card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:2.5rem;max-width:440px;width:100%;backdrop-filter:blur(20px);box-shadow:0 40px 80px rgba(0,0,0,0.5)}
  .brand{display:flex;align-items:center;gap:0.5rem;margin-bottom:1.5rem;opacity:0.6;font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase;font-family:'Manrope',sans-serif}
  .brand::before{content:'';width:8px;height:8px;border-radius:50%;background:#D90429;flex-shrink:0}
  h2{font-family:'Manrope',sans-serif;font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;color:#fff}
  p{color:rgba(255,255,255,0.5);font-size:0.9rem;margin-bottom:1.75rem;line-height:1.5}
  .lc-input{display:block;width:100%;background:rgba(255,255,255,0.06);border:none;border-radius:12px;padding:0.875rem 1rem;color:#e5e2e1;font-size:0.95rem;font-family:'Inter',sans-serif;margin-bottom:0.75rem;outline:none;transition:background 0.2s}
  .lc-input:focus{background:rgba(255,255,255,0.1)}
  .lc-input::placeholder{color:rgba(255,255,255,0.3)}
  button[type=submit]{width:100%;padding:1rem;background:linear-gradient(135deg,#D90429,#a50020);border:none;border-radius:12px;color:#fff;font-size:1rem;font-weight:600;font-family:'Manrope',sans-serif;cursor:pointer;margin-top:0.5rem;transition:opacity 0.2s;letter-spacing:0.02em}
  button[type=submit]:hover{opacity:0.9}
  .skip{display:block;text-align:center;color:rgba(255,255,255,0.35);font-size:0.8rem;margin-top:1rem;cursor:pointer;text-decoration:underline}
</style>
${pixelScripts}
</head><body>
<div class="card">
  <div class="brand">NQR · Powered by Neverno</div>
  <h2>${heading}</h2>
  <p>Please fill in your details to continue. We&apos;ll redirect you right after.</p>
  <form id="lcForm">
    ${fieldsHtml}
    <button type="submit">Continue →</button>
  </form>
  <span class="skip" onclick="skipAndRedirect()">Skip and continue</span>
</div>
<script>
  const FINAL_URL = ${JSON.stringify(finalUrl)};
  const QR_ID     = ${JSON.stringify(qrId)};
  function redirect(){ window.location.href = FINAL_URL; }
  function skipAndRedirect(){ redirect(); }
  document.getElementById('lcForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const API_BASE = '${process.env.API_BASE_URL || "https://5tr1w1t0si.execute-api.eu-north-1.amazonaws.com/Prod"}';
      await fetch(API_BASE + '/leads', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ qrId: QR_ID, ...data })
      });
    } catch(_){}
    redirect();
  });
</script>
</body></html>`;
}

// ── Retargeting Pixel Scripts ────────────────────────────
function buildPixelScripts(retargeting = {}, fire = true) {
  let scripts = '';
  if (retargeting && retargeting.fbPixelId) {
    scripts += `
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${retargeting.fbPixelId}');
fbq('track', 'PageView');
${fire ? "fbq('trackCustom', 'QRScan');" : ''}
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${retargeting.fbPixelId}&ev=PageView&noscript=1"/></noscript>`;
  }
  if (retargeting && retargeting.gtmId) {
    scripts += `
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${retargeting.gtmId}');</script>`;
  }
  return scripts;
}

function buildRetargetingPage(finalUrl, retargeting) {
  const pixelScripts = buildPixelScripts(retargeting, true);
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="1;url=${finalUrl}">
<title>Redirecting… — NQR</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#131313;color:#e5e2e1;font-family:'Inter',sans-serif}</style>
${pixelScripts}
</head><body>
<div style="text-align:center">
  <div style="width:32px;height:32px;border:3px solid rgba(217,4,41,0.3);border-top-color:#D90429;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem"></div>
  <p style="opacity:0.5;font-size:0.9rem">Redirecting…</p>
</div>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
<script>setTimeout(()=>{window.location.href=${JSON.stringify(finalUrl)}},600);</script>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event));
  const { httpMethod, path, pathParameters, body } = event;
  const resource = event.resource || '';

  if (httpMethod === "OPTIONS") return response(200, { success: true }, event);

  try {

    // ── AUTH Endpoints ─────────────────────────────────────
    if (path === "/auth/request-otp" && httpMethod === "POST") {
      const data  = JSON.parse(body);
      const email = data.email.toLowerCase().trim();
      if (!email.endsWith('@neverno.in') && data.type === 'OTP') {
        return response(400, { error: "Access restricted to @neverno.in domains." }, event);
      }
      if (data.type === 'SUPPORT') {
        await sendSESEmail(SES_SENDER, `New Support Request from ${email}`,
          `<p><b>From:</b> ${email}</p><p><b>Message:</b><br/>${data.message || 'No message provided'}</p>`);
        return response(200, { success: true }, event);
      }
      if (data.type === 'OTP') {
        if (data.action === 'reset') {
          const u = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
          if (!u.Item) return response(404, { error: "User not found." }, event);
        }
        const otp = generateOTP();
        const exp = Math.floor(Date.now() / 1000) + 600;
        await docClient.send(new PutCommand({ TableName: OTPS_TABLE, Item: { email, otp, expiration: exp } }));
        const subject = data.action === 'reset' ? "NQR Password Reset Code" : "NQR Account Verification Code";
        await sendSESEmail(email, subject, `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`);
        return response(200, { success: true }, event);
      }
    }

    if (path === "/auth/signup" && httpMethod === "POST") {
      const data  = JSON.parse(body);
      const email = data.email.toLowerCase().trim();
      const otpR  = await docClient.send(new GetCommand({ TableName: OTPS_TABLE, Key: { email } }));
      if (!otpR.Item || otpR.Item.otp !== data.otp || otpR.Item.expiration < Math.floor(Date.now() / 1000))
        return response(400, { error: "Invalid or expired verification code." }, event);
      const existing = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
      if (existing.Item) return response(400, { error: "User already exists." }, event);
      const sanitized = {
        email, id: Date.now().toString(), createdAt: new Date().toISOString(),
        firstName: (data.firstName || "").substring(0, 50).replace(/[<>]/g, ""),
        lastName:  (data.lastName  || "").substring(0, 50).replace(/[<>]/g, ""),
        password:  hashPassword(data.password)
      };
      await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: sanitized }));
      await docClient.send(new DeleteCommand({ TableName: OTPS_TABLE, Key: { email } }));
      return response(200, { success: true }, event);
    }

    if (path === "/auth/login" && httpMethod === "POST") {
      const data  = JSON.parse(body);
      const email = data.email.toLowerCase().trim();
      const u = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
      if (!u.Item || u.Item.password !== hashPassword(data.password))
        return response(403, { error: "The login email ID or password you entered is incorrect." }, event);
      return response(200, { success: true, user: { name: `${u.Item.firstName} ${u.Item.lastName}`.trim() } }, event);
    }

    if (path === "/auth/reset-password" && httpMethod === "POST") {
      const data  = JSON.parse(body);
      const email = data.email.toLowerCase().trim();
      const otpR  = await docClient.send(new GetCommand({ TableName: OTPS_TABLE, Key: { email } }));
      if (!otpR.Item || otpR.Item.otp !== data.otp || otpR.Item.expiration < Math.floor(Date.now() / 1000))
        return response(400, { error: "Invalid or expired verification code." }, event);
      await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE, Key: { email },
        UpdateExpression: "set password = :p",
        ExpressionAttributeValues: { ":p": hashPassword(data.newPassword) }
      }));
      await docClient.send(new DeleteCommand({ TableName: OTPS_TABLE, Key: { email } }));
      return response(200, { success: true }, event);
    }

    // ── User Settings (White-Label custom domain) ──────────
    if (path === "/user/settings" && httpMethod === "GET") {
      const email = event.queryStringParameters?.email;
      if (!email) return response(400, { error: "email required" }, event);
      const u = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
      return response(200, { settings: u.Item?.settings || {} }, event);
    }

    if (path === "/user/settings" && httpMethod === "POST") {
      const data  = JSON.parse(body);
      const email = (data.email || '').toLowerCase().trim();
      if (!email) return response(400, { error: "email required" }, event);
      await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE, Key: { email },
        UpdateExpression: "set settings = :s",
        ExpressionAttributeValues: { ":s": data.settings }
      }));
      return response(200, { success: true }, event);
    }

    // ── QR Management ──────────────────────────────────────
    if (path === "/qrs" && httpMethod === "POST") {
      const data  = JSON.parse(body);
      const email = (data.ownerEmail || 'anonymous@neverq.in').toLowerCase().trim();
      // Auto-provision tester
      if (email === 'tester@neverno.in') {
        try {
          const uc = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
          if (!uc.Item) await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: { email, firstName: "Tester", lastName: "Account", password: "BYPASS_ACTIVE", id: "tester-static-id", createdAt: new Date().toISOString() } }));
        } catch(e) { console.error("Provisioning error:", e); }
      }
      const qrId = `nqr-${Math.random().toString(36).substr(2, 9)}`;
      const item  = { id: qrId, ...data, ownerEmail: email, scans: 0, status: 'active', createdAt: new Date().toISOString() };
      await docClient.send(new PutCommand({ TableName: QRS_TABLE, Item: item }));
      return response(200, item, event);
    }

    if (path === "/qrs" && httpMethod === "GET") {
      const { ownerEmail } = event.queryStringParameters || {};
      const result = await docClient.send(new ScanCommand({
        TableName: QRS_TABLE,
        FilterExpression: "ownerEmail = :e",
        ExpressionAttributeValues: { ":e": ownerEmail }
      }));
      return response(200, result.Items, event);
    }

    // ── PATCH: Post-Generation Design Edit ────────────────
    if (resource === "/qrs/{qrId}" && httpMethod === "PATCH") {
      const { qrId } = pathParameters;
      const data = JSON.parse(body);
      await docClient.send(new UpdateCommand({
        TableName: QRS_TABLE, Key: { id: qrId },
        UpdateExpression: "set #opts = :o, #nm = :n, updatedAt = :t",
        ExpressionAttributeNames: { "#opts": "options", "#nm": "name" },
        ExpressionAttributeValues: {
          ":o": data.options,
          ":n": data.name || 'Updated QR',
          ":t": new Date().toISOString()
        }
      }));
      return response(200, { success: true }, event);
    }

    // ── Leads API ──────────────────────────────────────────
    if (path === "/leads" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const lead = {
        id: uid(),
        qrId:      data.qrId || 'unknown',
        ownerEmail: data.ownerEmail || 'unknown',
        name:      (data.name  || '').substring(0, 100),
        email:     (data.email || '').substring(0, 100),
        phone:     (data.phone || '').substring(0, 30),
        createdAt: new Date().toISOString()
      };
      await docClient.send(new PutCommand({ TableName: LEADS_TABLE, Item: lead }));
      return response(200, { success: true }, event);
    }

    if (path === "/leads" && httpMethod === "GET") {
      const { qrId, ownerEmail } = event.queryStringParameters || {};
      let filterExp = '';
      const expAttr = {};
      if (qrId) { filterExp = 'qrId = :q'; expAttr[':q'] = qrId; }
      else if (ownerEmail) { filterExp = 'ownerEmail = :o'; expAttr[':o'] = ownerEmail; }
      const result = await docClient.send(new ScanCommand({
        TableName: LEADS_TABLE,
        ...(filterExp ? { FilterExpression: filterExp, ExpressionAttributeValues: expAttr } : {})
      }));
      return response(200, result.Items || [], event);
    }

    // ── Lead Submission from Capture Form ─────────────────
    if (resource === "/s/{qrId}/lead" && httpMethod === "POST") {
      const { qrId } = pathParameters;
      const data = JSON.parse(body || '{}');
      const qrRes = await docClient.send(new GetCommand({ TableName: QRS_TABLE, Key: { id: qrId } }));
      const ownerEmail = qrRes.Item?.ownerEmail || 'unknown';
      const lead = {
        id: uid(), qrId, ownerEmail,
        name:  (data.name  || '').substring(0, 100),
        email: (data.email || '').substring(0, 100),
        phone: (data.phone || '').substring(0, 30),
        createdAt: new Date().toISOString()
      };
      await docClient.send(new PutCommand({ TableName: LEADS_TABLE, Item: lead }));
      return response(200, { success: true }, event);
    }

    // ── 🌟 SMART REDIRECTOR ────────────────────────────────
    if (resource === "/s/{qrId}" && httpMethod === "GET") {
      const { qrId }      = pathParameters;
      const pinProvided   = event.queryStringParameters?.pin || null;
      const country       = event.headers?.['cloudfront-viewer-country'] || event.headers?.['CloudFront-Viewer-Country'] || '';
      const language      = event.headers?.['accept-language'] || event.headers?.['Accept-Language'] || '';

      const result = await docClient.send(new GetCommand({ TableName: QRS_TABLE, Key: { id: qrId } }));
      if (!result.Item) return response(404, { error: "QR not found" }, event);

      const item      = result.Item;
      // Ultra-flexible lookup: check root, options, config, and smart paths
      const options   = {
        ...(item.options || {}),
        ...(item.config?.options || {}),
        ...(item.config?.smart || {}),
        ...(item.smart || {}),
        // Explicit overrides for critical fields if they exist at root
        password:  item.password  || item.options?.password  || item.config?.options?.password  || item.config?.smart?.password  || item.smart?.password,
        expiresAt: item.expiresAt || item.options?.expiresAt || item.config?.options?.expiresAt || item.config?.smart?.expiresAt || item.smart?.expiresAt,
        leadCapture: item.leadCapture || item.options?.leadCapture || item.config?.options?.leadCapture || item.smart?.leadCapture
      };
      const scans     = item.scans   || 0;
      const createdAt = new Date(item.createdAt || item.created_at || Date.now()).getTime();
      const now       = Date.now();

      // Extract critical security fields with type-safety
      const activePassword = String(item.password || options.password || "").trim();
      const activeExpiry   = options.expiresAt || "never";

      // 1. Check Expiry
      const expiryType = options.expiresAt || 'never';
      let isExpired = false;
      if (expiryType === '1h'    && now - createdAt > 3600000)   isExpired = true;
      if (expiryType === '24h'   && now - createdAt > 86400000)  isExpired = true;
      if (expiryType === '7d'    && now - createdAt > 604800000) isExpired = true;
      if (expiryType === '1scan' && scans >= 1)                  isExpired = true;
      if (isExpired) {
        return responseHTML(410, `<div style="text-align:center;padding:50px;font-family:sans-serif;color:#fff;background:#131313;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center"><div style="font-size:60px;margin-bottom:20px">⌛</div><h1>Link Expired</h1><p style="color:rgba(255,255,255,0.5)">This QR code has expired.</p><a href="https://neverq.in" style="margin-top:20px;color:#D90429;text-decoration:none;font-weight:bold">Create your own NQR →</a></div>`, event);
      }

      // 2. Check Password (PIN)
      if (activePassword && activePassword !== String(pinProvided || "")) {
        return responseHTML(200, `<div style="text-align:center;padding:50px;font-family:sans-serif;color:#fff;background:#131313;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center"><div style="background:rgba(255,255,255,0.04);padding:40px;border-radius:24px;max-width:400px;width:100%;border:1px solid rgba(255,255,255,0.08)"><div style="font-size:40px;margin-bottom:20px">🔒</div><h1 style="font-size:20px;margin-bottom:10px">Password Protected</h1><p style="color:rgba(255,255,255,0.5);margin-bottom:30px;font-size:14px">Enter the PIN to access this link.</p><form id="pf" style="display:flex;flex-direction:column;gap:15px"><input type="password" id="pi" placeholder="Enter PIN" maxlength="8" style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.15);padding:15px;border-radius:12px;color:#fff;text-align:center;font-size:20px;letter-spacing:0.3em;outline:none" autocomplete="off"/><button type="submit" style="background:#D90429;color:#fff;border:none;padding:15px;border-radius:12px;font-weight:bold;cursor:pointer;font-size:16px">Access Link</button></form><p id="em" style="color:#D90429;margin-top:15px;font-size:13px;display:none">Incorrect PIN.</p></div></div><script>document.getElementById('pf').onsubmit=(e)=>{e.preventDefault();const p=document.getElementById('pi').value;if(!p)return;const url=new URL(window.location.href);url.searchParams.set('pin',p);window.location.href=url.toString()};if(new URLSearchParams(window.location.search).has('pin'))document.getElementById('em').style.display='block'</script>`, event);
      }

      // 3. Increment Scan Count
      await docClient.send(new UpdateCommand({
        TableName: QRS_TABLE, Key: { id: qrId },
        UpdateExpression: "set scans = scans + :val",
        ExpressionAttributeValues: { ":val": 1 }
      }));

      // 4. Evaluate Smart Rules
      const rules = options.rules || [];
      const ctx   = { country, language, scans: scans + 1 };
      let finalUrl = evaluateRules(rules, ctx) || item.url;

      // 5. Lead Capture Gate (takes priority over retargeting)
      if (options.leadCapture && options.leadCapture.enabled) {
        return responseHTML(200, buildLeadCaptureHTML(qrId, options.leadCapture, finalUrl, options.retargeting), event);
      }

      // 6. Retargeting Intermediate Page
      if (options.retargeting && (options.retargeting.fbPixelId || options.retargeting.gtmId)) {
        return responseHTML(200, buildRetargetingPage(finalUrl, options.retargeting), event);
      }

      // 7. Plain Redirect
      return { statusCode: 302, headers: { Location: finalUrl } };
    }

    // ── Admin Endpoints ────────────────────────────────────
    if (path === "/admin/stats" && httpMethod === "GET") {
      const users = await docClient.send(new ScanCommand({ TableName: USERS_TABLE, Select: "COUNT" }));
      const qrs   = await docClient.send(new ScanCommand({ TableName: QRS_TABLE }));
      const leads = await docClient.send(new ScanCommand({ TableName: LEADS_TABLE, Select: "COUNT" }));
      const totalScans = qrs.Items.reduce((a, c) => a + (c.scans || 0), 0);
      return response(200, { totalUsers: users.Count, totalQrs: qrs.Items.length, totalScans, totalLeads: leads.Count }, event);
    }

    if (path === "/admin/users" && httpMethod === "GET") {
      const result = await docClient.send(new ScanCommand({ TableName: USERS_TABLE }));
      return response(200, result.Items, event);
    }

    if (path === "/admin/qrs" && httpMethod === "GET") {
      const result = await docClient.send(new ScanCommand({ TableName: QRS_TABLE }));
      return response(200, result.Items, event);
    }

    if (path === "/admin/leads" && httpMethod === "GET") {
      const { ownerEmail } = event.queryStringParameters || {};
      let filterExp = ''; const expAttr = {};
      if (ownerEmail) { filterExp = 'ownerEmail = :o'; expAttr[':o'] = ownerEmail; }
      const result = await docClient.send(new ScanCommand({
        TableName: LEADS_TABLE,
        ...(filterExp ? { FilterExpression: filterExp, ExpressionAttributeValues: expAttr } : {})
      }));
      return response(200, result.Items || [], event);
    }

    return response(404, { error: "Not Found" }, event);

  } catch (err) {
    console.error(err);
    return response(500, { error: err.message }, event);
  }
};

// ── Response Helpers ─────────────────────────────────────
function response(statusCode, body, event = null) {
  const origin = event?.headers?.origin || event?.headers?.Origin || "*";
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin":  origin,
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,PATCH,DELETE",
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With",
      "Access-Control-Allow-Credentials": "true",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
    },
    body: JSON.stringify(body)
  };
}

function responseHTML(statusCode, html, event = null) {
  const origin = event?.headers?.origin || event?.headers?.Origin || "*";
  return {
    statusCode,
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin":  origin,
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
    },
    body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>NQR</title><style>body{margin:0;padding:0;background:#131313;color:#e5e2e1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}</style></head><body>${html}</body></html>`
  };
}
