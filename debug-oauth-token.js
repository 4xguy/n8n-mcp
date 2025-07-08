// Debug script to test OAuth token exchange
const https = require('https');

const SERVER_URL = 'n8n-mcp-production-c68a.up.railway.app';

// Replace these with your actual values from MCP Inspector
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const AUTH_CODE = 'YOUR_AUTH_CODE';
const REDIRECT_URI = 'http://localhost:8274/oauth/callback/debug';

const tokenData = {
  grant_type: 'authorization_code',
  code: AUTH_CODE,
  redirect_uri: REDIRECT_URI,
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET
};

const postData = JSON.stringify(tokenData);

const options = {
  hostname: SERVER_URL,
  port: 443,
  path: '/oauth/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Request details:');
console.log('URL:', `https://${SERVER_URL}/oauth/token`);
console.log('Method:', options.method);
console.log('Headers:', options.headers);
console.log('Body:', JSON.stringify(tokenData, null, 2));

const req = https.request(options, (res) => {
  console.log('\nResponse:');
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse body:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(postData);
req.end();