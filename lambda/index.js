const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const https = require('https');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'NqrUsers';
const QRS_TABLE = process.env.QRS_TABLE || 'NqrQrs';

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event));
  const { httpMethod, path, pathParameters, body } = event;
  const resource = event.resource;

  try {
16:     // ── AUTH Endpoints ──
17:     if (path === "/signup" && httpMethod === "POST") {
18:       const data = JSON.parse(body);
19:       
20:       // Turnstile Verification
21:       const turnstile = await verifyTurnstile(data.turnstileToken);
22:       if (!turnstile.success) {
23:         return response(403, { error: "Security check failed. Please refresh and try again." });
24:       }
25: 
26:       if (!data.email || !data.email.toLowerCase().endsWith('@neverno.in')) {
27:         return response(400, { error: "Registration restricted. Please use an @neverno.in email." });
28:       }
29: 
30:       // Basic Sanitation
31:       const sanitized = {
32:         email: data.email.toLowerCase().trim(),
33:         firstName: (data.firstName || "").substring(0, 50).replace(/[<>]/g, ""),
34:         lastName: (data.lastName || "").substring(0, 50).replace(/[<>]/g, "")
35:       };
36: 
37:       await docClient.send(new PutCommand({
38:         TableName: USERS_TABLE,
39:         Item: { ...sanitized, id: Date.now().toString(), createdAt: new Date().toISOString() }
40:       }));
41:       return response(200, { success: true });
42:     }
43: 
44:     if (path === "/login" && httpMethod === "POST") {
45:       const data = JSON.parse(body);
46:       
47:       // Turnstile Verification
48:       const turnstile = await verifyTurnstile(data.turnstileToken || data.body?.turnstileToken); // Handle both formats
49:       if (!turnstile.success) {
50:         return response(403, { error: "Security check failed." });
51:       }
52: 
53:       if (!data.email || !data.email.toLowerCase().endsWith('@neverno.in')) {
54:         return response(400, { error: "Access restricted. Please use an @neverno.in email." });
55:       }

      // Mock login for now, as requested. In prod, check DynamoDB.
      return response(200, { success: true, user: { name: "Jane Doe" } });
    }

    // ── QR MANAGEMENT ──
    if (path === "/qrs" && httpMethod === "POST") {
      const data = JSON.parse(body);
      const qrId = `nqr-${Math.random().toString(36).substr(2, 9)}`;
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
119: };
120: 
121: async function verifyTurnstile(token) {
122:   if (!token) return { success: false };
123:   const secret = process.env.TURNSTILE_SECRET || '1x0000000000000000000000000000000AA';
124:   const data = `secret=${secret}&response=${token}`;
125: 
126:   return new Promise((resolve, reject) => {
127:     const req = https.request({
128:       hostname: 'challenges.cloudflare.com',
129:       path: '/turnstile/v0/siteverify',
130:       method: 'POST',
131:       headers: {
132:         'Content-Type': 'application/x-www-form-urlencoded',
133:         'Content-Length': data.length
134:       }
135:     }, (res) => {
136:       let body = '';
137:       res.on('data', (chunk) => body += chunk);
138:       res.on('end', () => {
139:         try { resolve(JSON.parse(body)); }
140:         catch (e) { resolve({ success: false }); }
141:       });
142:     });
143:     req.on('error', () => resolve({ success: false }));
144:     req.write(data);
145:     req.end();
146:   });
147: }
148: 
149: function response(statusCode, body) {
150:   const origin = process.env.ALLOWED_ORIGIN || "*"; // Set this to your production domain
151:   return {
152:     statusCode,
153:     headers: {
154:       "Content-Type": "application/json",
155:       "Access-Control-Allow-Origin": origin,
156:       "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
157:       "X-Content-Type-Options": "nosniff",
158:       "X-Frame-Options": "DENY",
159:       "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
160:     },
161:     body: JSON.stringify(body)
162:   };
163: }
