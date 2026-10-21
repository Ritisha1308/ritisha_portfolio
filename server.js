/* =====================================================
   Ritisha Naigaonkar - Portfolio server (Node.js, no packages needed)
   Run:  node server.js     then open  http://localhost:3000
   ===================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const MESSAGES_FILE = path.join(ROOT, 'messages.json');

// Only these files can be requested from the browser (also blocks path traversal)
const PUBLIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/style.css': 'style.css',
  '/script.js': 'script.js',
  '/resume.pdf': 'resume.pdf'
};

// Files inside these two folders are also public (images only, no sub-folders)
const ASSET_PATTERN = /^\/(images|certificates)\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp|svg)$/i;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; " +
    "connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
};

// ---------- Project data (served at GET /api/projects) ----------
// Add a "link" (GitHub or live URL) to show a "View project" link on the card.
const PROJECTS = [
  {
    id: 'agentic-marketing',
    title: 'Agentic AI Marketing Message Generator',
    summary: 'Three agents work in sequence: one analyses the audience, one builds the marketing strategy, and one writes the personalised message.',
    stack: ['Python', 'Gradio', 'Groq', 'Qwen'],
    tags: ['ai'],
    status: 'Deployed on Render',
    featured: true,
    link: null
  },
  {
    id: 'train-buddy',
    title: 'Train Buddy',
    summary: 'A skill-exchange platform where people teach and learn through live sessions, chat and collaborative learning.',
    stack: [],
    tags: ['web'],
    status: 'Completed',
    featured: false,
    link: null
  },
  {
    id: 'visual-tracking',
    title: 'AI Real-Time Visual Tracking System',
    summary: 'A CCTV surveillance system that uses facial recognition to detect and identify registered and unregistered individuals.',
    stack: ['Facial recognition', 'Computer vision'],
    tags: ['ai', 'security'],
    status: 'Built',
    featured: false,
    link: null
  },
  {
    id: 'cyberrakshak',
    title: 'CyberRakshak',
    summary: 'An AI-powered mobile security app concept that protects users from fraudulent calls, fake QR codes and malicious applications.',
    stack: [],
    tags: ['ai', 'security'],
    status: 'Concept',
    featured: false,
    link: null
  },
  {
    id: 'ultrasonic-stick',
    title: 'Ultrasonic Sensor Stick',
    summary: 'A hands-on hardware prototype: an Arduino UNO reads an ultrasonic distance sensor mounted on a stick and runs on a 9V battery.',
    stack: ['Arduino UNO', 'Ultrasonic sensor', '9V battery'],
    tags: ['hardware'],
    status: 'Prototype',
    featured: false,
    link: null,
    image: 'images/arduino-circuit.jpg',
    imageAlt: 'Arduino UNO wired to an ultrasonic sensor and a 9V battery'
  }
];

// ---------- Helpers ----------
function sendJSON(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
  res.end(JSON.stringify(body));
}

async function sendFile(res, fileName) {
  const filePath = path.join(ROOT, fileName);
  if (!filePath.startsWith(ROOT + path.sep)) return sendJSON(res, 403, { error: 'Forbidden.' });
  try {
    await fsp.access(filePath);
  } catch {
    return sendJSON(res, 404, { error: `${fileName} not found.` });
  }
  const ext = path.extname(fileName).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ASSET_PATTERN.test('/' + fileName) ? 'public, max-age=86400' : 'no-cache',
    ...SECURITY_HEADERS
  });
  fs.createReadStream(filePath)
    .on('error', () => res.destroy())
    .pipe(res);
}

function readBody(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        const err = new Error('Body too large');
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Simple in-memory rate limit: 5 messages per IP every 10 minutes
const hits = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

// Save messages one at a time so two requests never overwrite each other
let writeQueue = Promise.resolve();
function saveMessage(entry) {
  const run = writeQueue.catch(() => {}).then(async () => {
    let list = [];
    try {
      list = JSON.parse(await fsp.readFile(MESSAGES_FILE, 'utf8'));
    } catch { /* first message, file does not exist yet */ }
    list.push(entry);
    await fsp.writeFile(MESSAGES_FILE, JSON.stringify(list, null, 2));
  });
  writeQueue = run;
  return run;
}

async function handleContact(req, res) {
  if (isRateLimited(req.socket.remoteAddress)) {
    return sendJSON(res, 429, { error: 'Too many messages. Please try again in a few minutes.' });
  }

  let data;
  try {
    data = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJSON(res, err.status || 400, { error: err.status === 413 ? 'Message is too large.' : 'Invalid request.' });
  }

  const name = clean(data.name, 80);
  const email = clean(data.email, 120);
  const message = clean(data.message, 2000);

  if (name.length < 2) return sendJSON(res, 400, { error: 'Please enter your name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJSON(res, 400, { error: 'Please enter a valid email.' });
  if (message.length < 10) return sendJSON(res, 400, { error: 'Your message is too short.' });

  try {
    await saveMessage({ name, email, message, receivedAt: new Date().toISOString() });
    console.log(`New message from ${name} <${email}>`);
    sendJSON(res, 201, { ok: true });
  } catch (err) {
    console.error('Could not save message:', err);
    sendJSON(res, 500, { error: 'Could not save your message. Please try again.' });
  }
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && pathname === '/api/projects') {
      return sendJSON(res, 200, { projects: PROJECTS });
    }
    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJSON(res, 200, { status: 'ok', time: new Date().toISOString() });
    }
    if (req.method === 'POST' && pathname === '/api/contact') {
      return await handleContact(req, res);
    }
    if (req.method === 'GET' && Object.prototype.hasOwnProperty.call(PUBLIC_FILES, pathname)) {
      return await sendFile(res, PUBLIC_FILES[pathname]);
    }
    if (req.method === 'GET' && ASSET_PATTERN.test(pathname)) {
      return await sendFile(res, pathname.slice(1));
    }
    sendJSON(res, 404, { error: 'Not found.' });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJSON(res, 500, { error: 'Server error.' });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Try: PORT=3001 node server.js`);
  else console.error(err);
  process.exit(1);
});

server.listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}`));
