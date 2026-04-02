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

  try {
    // ── AUTH & COMMUNICATION Endpoints ──
    if (path === "/auth/request-otp" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const email = data.email.toLowerCase().trim();
      
      if (!email.endsWith('@neverno.in') && data.type === 'OTP') {
        return response(400, { error: "Access restricted to @neverno.in domains." });
      }

      if (data.type === 'SUPPORT') {
        // Send a support email
        await sendSESEmail(
          SES_SENDER, // Send to ourselves or a support inbox
          \`New Support Request from \${email}\`,
          \`<p><b>From:</b> \${email}</p><p><b>Message:</b><br/>\${data.message || 'No message provided'}</p>\`
        );
        return response(200, { success: true });
      }

      if (data.type === 'OTP') {
        if (data.action === 'reset') {
          // Check if user exists
          const userResult = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
          if (!userResult.Item) {
            return response(404, { error: "User not found." });
          }
        }

        const otp = generateOTP();
        const expiration = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await docClient.send(new PutCommand({
          TableName: OTPS_TABLE,
          Item: { email, otp, expiration }
        }));

        const subject = data.action === 'reset' ? "NQR Password Reset Code" : "NQR Account Verification Code";
        const emailBody = \`<p>Your verification code is: <strong>\${otp}</strong></p><p>This code will expire in 10 minutes.</p>\`;
        
        await sendSESEmail(email, subject, emailBody);
        return response(200, { success: true });
      }
    }

    if (path === "/auth/signup" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const email = data.email.toLowerCase().trim();

      // Verify OTP
      const otpResult = await docClient.send(new GetCommand({ TableName: OTPS_TABLE, Key: { email } }));
      if (!otpResult.Item || otpResult.Item.otp !== data.otp || otpResult.Item.expiration < Math.floor(Date.now() / 1000)) {
        return response(400, { error: "Invalid or expired verification code." });
      }

      // Check if user already exists
      const existingUser = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
      if (existingUser.Item) {
        return response(400, { error: "User already exists." });
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

      return response(200, { success: true });
    }

    if (path === "/auth/login" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const email = data.email.toLowerCase().trim();

      const userResult = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
      
      if (!userResult.Item || userResult.Item.password !== hashPassword(data.password)) {
        return response(403, { error: "The login email ID or password you entered is incorrect." });
      }

      return response(200, { success: true, user: { name: \`\${userResult.Item.firstName} \${userResult.Item.lastName}\`.trim() } });
    }

    if (path === "/auth/reset-password" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const email = data.email.toLowerCase().trim();

      // Verify OTP
      const otpResult = await docClient.send(new GetCommand({ TableName: OTPS_TABLE, Key: { email } }));
      if (!otpResult.Item || otpResult.Item.otp !== data.otp || otpResult.Item.expiration < Math.floor(Date.now() / 1000)) {
        return response(400, { error: "Invalid or expired verification code." });
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

      return response(200, { success: true });
    }

    // ── QR MANAGEMENT ──
    if (path === "/qrs" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const qrId = \`nqr-\${Math.random().toString(36).substr(2, 9)}\`;
      const item = {
        id: qrId,
        ...data,
        scans: 0,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      await docClient.send(new PutCommand({ TableName: QRS_TABLE, Item: item }));
      return response(200, item);
    }

    if (path === "/qrs" && httpMethod === "GET") {
      const { ownerEmail } = event.queryStringParameters || {};
      const result = await docClient.send(new ScanCommand({
        TableName: QRS_TABLE,
        FilterExpression: "ownerEmail = :e",
        ExpressionAttributeValues: { ":e": ownerEmail }
      }));
      return response(200, result.Items);
    }

    // ── REDIRECTOR (Scan Tracking) ──
    if (resource === "/s/{qrId}" && httpMethod === "GET") {
      const { qrId } = pathParameters;
      const result = await docClient.send(new GetCommand({ TableName: QRS_TABLE, Key: { id: qrId } }));
      
      if (!result.Item) return response(404, { error: "QR not found" });

      // Increment Scan Count
      await docClient.send(new UpdateCommand({
        TableName: QRS_TABLE,
        Key: { id: qrId },
        UpdateExpression: "set scans = scans + :val",
        ExpressionAttributeValues: { ":val": 1 }
      }));

      // Redirect to target URL
      return {
        statusCode: 302,
        headers: { Location: result.Item.url }
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
      });
    }

    if (path === "/admin/users" && httpMethod === "GET") {
      const result = await docClient.send(new ScanCommand({ TableName: USERS_TABLE }));
      return response(200, result.Items);
    }

    if (path === "/admin/qrs" && httpMethod === "GET") {
      const result = await docClient.send(new ScanCommand({ TableName: QRS_TABLE }));
      return response(200, result.Items);
    }

    return response(404, { error: "Not Found" });

  } catch (err) {
    console.error(err);
    return response(500, { error: err.message });
  }
};

async function verifyTurnstile(token) {
  if (!token) return { success: false };
  const secret = process.env.TURNSTILE_SECRET || '1x0000000000000000000000000000000AA';
  const data = \`secret=\${secret}&response=\${token}\`;

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

function response(statusCode, body) {
  const origin = process.env.ALLOWED_ORIGIN || "*"; 
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
    },
    body: JSON.stringify(body)
  };
}
