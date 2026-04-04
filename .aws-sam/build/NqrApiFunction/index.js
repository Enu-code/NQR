const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const https = require('https');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sesClient = new SESClient({});

const USERS_TABLE = process.env.USERS_TABLE || 'NqrUsers';
const QRS_TABLE = process.env.QRS_TABLE || 'NqrQrs';
const OTPS_TABLE = process.env.OTPS_TABLE || 'NqrOtps';
const SES_SENDER = process.env.SES_SENDER || 'support@neverno.in';

// Helper for hashing passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper to generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

// Helper to send SES Email
async function sendSESEmail(toAddress, subject, bodyHtml) {
  const params = {
    Destination: { ToAddresses: [toAddress] },
    Message: {
      Body: { Html: { Charset: "UTF-8", Data: bodyHtml } },
      Subject: { Charset: "UTF-8", Data: subject }
    },
    Source: SES_SENDER
  };
  return sesClient.send(new SendEmailCommand(params));
}

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event));
  const { httpMethod, path, pathParameters, body } = event;
  const resource = event.resource;

  // 🛡️ GLOBAL CORS PREFLIGHT: Handle browser pre-checks
  if (httpMethod === "OPTIONS") {
    return response(200, { success: true }, event);
  }

  try {
    // ── AUTH & COMMUNICATION Endpoints ──
    if (path === "/auth/request-otp" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const email = data.email.toLowerCase().trim();
      
      if (!email.endsWith('@neverno.in') && data.type === 'OTP') {
        return response(400, { error: "Access restricted to @neverno.in domains." }, event);
      }

      if (data.type === 'SUPPORT') {
        // Send a support email
        await sendSESEmail(
          SES_SENDER, // Send to ourselves or a support inbox
          `New Support Request from ${email}`,
          `<p><b>From:</b> ${email}</p><p><b>Message:</b><br/>${data.message || 'No message provided'}</p>`
        );
        return response(200, { success: true }, event);
      }

      if (data.type === 'OTP') {
        if (data.action === 'reset') {
          // Check if user exists
          const userResult = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
          if (!userResult.Item) {
            return response(404, { error: "User not found." }, event);
          }
        }

        const otp = generateOTP();
        const expiration = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await docClient.send(new PutCommand({
          TableName: OTPS_TABLE,
          Item: { email, otp, expiration }
        }));

        const subject = data.action === 'reset' ? "NQR Password Reset Code" : "NQR Account Verification Code";
        const emailBody = `<p>Your verification code is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`;
        
        await sendSESEmail(email, subject, emailBody);
        return response(200, { success: true }, event);
      }
    }

    if (path === "/auth/signup" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const email = data.email.toLowerCase().trim();

      // Verify OTP
      const otpResult = await docClient.send(new GetCommand({ TableName: OTPS_TABLE, Key: { email } }));
      if (!otpResult.Item || otpResult.Item.otp !== data.otp || otpResult.Item.expiration < Math.floor(Date.now() / 1000)) {
        return response(400, { error: "Invalid or expired verification code." }, event);
      }

      // Check if user already exists
      const existingUser = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
      if (existingUser.Item) {
        return response(400, { error: "User already exists." }, event);
      }

      const sanitized = {
        email: email,
        firstName: (data.firstName || "").substring(0, 50).replace(/[<>]/g, ""),
        lastName: (data.lastName || "").substring(0, 50).replace(/[<>]/g, ""),
        password: hashPassword(data.password)
      };

      await docClient.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: { ...sanitized, id: Date.now().toString(), createdAt: new Date().toISOString() }
      }));
      
      // Cleanup OTP
      await docClient.send(new DeleteCommand({ TableName: OTPS_TABLE, Key: { email } }));

      return response(200, { success: true }, event);
    }

    if (path === "/auth/login" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const email = data.email.toLowerCase().trim();

      const userResult = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
      
      if (!userResult.Item || userResult.Item.password !== hashPassword(data.password)) {
        return response(403, { error: "The login email ID or password you entered is incorrect." }, event);
      }

      return response(200, { success: true, user: { name: `${userResult.Item.firstName} ${userResult.Item.lastName}`.trim() } }, event);
    }

    if (path === "/auth/reset-password" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const email = data.email.toLowerCase().trim();

      // Verify OTP
      const otpResult = await docClient.send(new GetCommand({ TableName: OTPS_TABLE, Key: { email } }));
      if (!otpResult.Item || otpResult.Item.otp !== data.otp || otpResult.Item.expiration < Math.floor(Date.now() / 1000)) {
        return response(400, { error: "Invalid or expired verification code." }, event);
      }

      // Update password
      await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { email },
        UpdateExpression: "set password = :p",
        ExpressionAttributeValues: { ":p": hashPassword(data.newPassword) }
      }));
      
      // Cleanup OTP
      await docClient.send(new DeleteCommand({ TableName: OTPS_TABLE, Key: { email } }));

      return response(200, { success: true }, event);
    }

    // ── QR MANAGEMENT ──
    if (path === "/qrs" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const email = (data.ownerEmail || 'anonymous@neverq.in').toLowerCase().trim();
      
      // 🛡️ AUTO-PROVISION TESTER: Ensure tester exists in USERS_TABLE so they show in Admin
      if (email === 'tester@neverno.in') {
        try {
          const userCheck = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
          if (!userCheck.Item) {
            await docClient.send(new PutCommand({
              TableName: USERS_TABLE,
              Item: {
                email,
                firstName: "Tester",
                lastName: "Account",
                password: "BYPASS_ACTIVE",
                id: "tester-static-id",
                createdAt: new Date().toISOString()
              }
            }));
            console.log("Auto-provisioned Tester Account in DynamoDB.");
          }
        } catch (e) {
          console.error("Provisioning error:", e);
        }
      }

      const qrId = `nqr-${Math.random().toString(36).substr(2, 9)}`;
      const item = {
        id: qrId,
        ...data,
        ownerEmail: email,
        scans: 0,
        status: 'active',
        createdAt: new Date().toISOString()
      };
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

    // ── REDIRECTOR (Scan Tracking & Security) ──
    if (resource === "/s/{qrId}" && httpMethod === "GET") {
      const { qrId } = pathParameters;
      const pinProvided = event.queryStringParameters?.pin || null;
      
      const result = await docClient.send(new GetCommand({ TableName: QRS_TABLE, Key: { id: qrId } }));
      if (!result.Item) return response(404, { error: "QR not found" }, event);

      const item = result.Item;
      const createdAt = new Date(item.createdAt).getTime();
      const now = Date.now();
      const options = item.options || {};
      const scans = item.scans || 0;

      // 1. Check Expiry
      let isExpired = false;
      const expiryType = options.expiresAt || 'never';
      if (expiryType === '1h' && now - createdAt > 3600000) isExpired = true;
      if (expiryType === '24h' && now - createdAt > 86400000) isExpired = true;
      if (expiryType === '7d' && now - createdAt > 604800000) isExpired = true;
      if (expiryType === '1scan' && scans >= 1) isExpired = true;

      if (isExpired) {
        return responseHTML(410, `
          <div style="text-align:center;padding:50px;font-family:sans-serif;color:#fff;background:#0F1636;min-height:100vh;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:60px;margin-bottom:20px;">⌛</div>
            <h1 style="font-size:24px;">Link Expired</h1>
            <p style="color:rgba(255,255,255,0.6);">This QR code was set to expire and is no longer active.</p>
            <a href="https://neverq.in" style="margin-top:20px;display:inline-block;color:#D90429;text-decoration:none;font-weight:bold;">Create your own NQR &rarr;</a>
          </div>
        `, event);
      }

      // 2. Check Password (PIN)
      if (options.password && options.password !== pinProvided) {
        return responseHTML(200, `
          <div style="text-align:center;padding:50px;font-family:sans-serif;color:#fff;background:#0F1636;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;">
             <div style="background:rgba(255,255,255,0.05);padding:40px;border-radius:24px;border:1px solid rgba(255,255,255,0.1);max-width:400px;width:100%;">
                <div style="font-size:40px;margin-bottom:20px;">🔒</div>
                <h1 style="font-size:20px;margin-bottom:10px;">Password Protected</h1>
                <p style="color:rgba(255,255,255,0.6);margin-bottom:30px;font-size:14px;">Please enter the 4-digit PIN to access this link.</p>
                
                <form id="pinForm" style="display:flex;flex-direction:column;gap:15px;">
                  <input type="password" id="pinInput" placeholder="Enter PIN" maxlength="8" style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.2);padding:15px;border-radius:12px;color:#fff;text-align:center;font-size:20px;letter-spacing:0.3em;outline:none;"/>
                  <button type="submit" style="background:#D90429;color:#fff;border:none;padding:15px;border-radius:12px;font-weight:bold;cursor:pointer;font-size:16px;">Access Link</button>
                </form>
                <p id="errMsg" style="color:#D90429;margin-top:15px;font-size:13px;display:none;">Incorrect PIN. Please try again.</p>
             </div>
             <script>
               document.getElementById('pinForm').onsubmit = (e) => {
                 e.preventDefault();
                 const pin = document.getElementById('pinInput').value;
                 if(!pin) return;
                 window.location.href = window.location.pathname + '?pin=' + pin;
               };
               if (window.location.search.includes('pin=')) {
                 document.getElementById('errMsg').style.display = 'block';
               }
             </script>
          </div>
        `, event);
      }

      // 3. Success: Increment Scan Count and Redirect
      await docClient.send(new UpdateCommand({
        TableName: QRS_TABLE,
        Key: { id: qrId },
        UpdateExpression: "set scans = scans + :val",
        ExpressionAttributeValues: { ":val": 1 }
      }));

      return {
        statusCode: 302,
        headers: { Location: item.url }
      };
    }


    // ── ADMIN Endpoints ──
    if (path === "/admin/stats" && httpMethod === "GET") {
      const users = await docClient.send(new ScanCommand({ TableName: USERS_TABLE, Select: "COUNT" }));
      const qrs = await docClient.send(new ScanCommand({ TableName: QRS_TABLE }));
      const totalScans = qrs.Items.reduce((acc, curr) => acc + (curr.scans || 0), 0);

      return response(200, {
        totalUsers: users.Count,
        totalQrs: qrs.Items.length,
        totalScans: totalScans
      }, event);
    }

    if (path === "/admin/users" && httpMethod === "GET") {
      const result = await docClient.send(new ScanCommand({ TableName: USERS_TABLE }));
      return response(200, result.Items, event);
    }

    if (path === "/admin/qrs" && httpMethod === "GET") {
      const result = await docClient.send(new ScanCommand({ TableName: QRS_TABLE }));
      return response(200, result.Items, event);
    }

    return response(404, { error: "Not Found" }, event);

  } catch (err) {
    console.error(err);
    return response(500, { error: err.message }, event);
  }
};

async function verifyTurnstile(token) {
  if (!token) return { success: false };
  const secret = process.env.TURNSTILE_SECRET || '1x0000000000000000000000000000000AA';
  const data = `secret=${secret}&response=${token}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'challenges.cloudflare.com',
      path: '/turnstile/v0/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ success: false }); }
      });
    });
    req.on('error', () => resolve({ success: false }));
    req.write(data);
    req.end();
  });
}

function response(statusCode, body, event = null) {
  // 🛡️ DYNAMIC ORIGIN: Echo back the requesting origin (important for null origins like file:///)
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin || "*";
  
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": requestOrigin,
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
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
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin || "*";
  return {
    statusCode,
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": requestOrigin,
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
    },
    body: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>NQR Secure Access</title>
          <style>
            body { margin: 0; padding: 0; background: #0F1636; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `
  };
}

