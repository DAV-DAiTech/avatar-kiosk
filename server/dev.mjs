// Local stand-in for Vercel: serves the api/ handlers on http://localhost:8096
// using the key from ../.env. Usage:  node server/dev.mjs
// Then open the kiosk with ?api=http://localhost:8096
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
try {
  for (const line of readFileSync(join(here, '..', '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env: rely on the environment */ }

const routes = {
  '/api/session': (await import('./api/session.js')).default,
  '/api/status': (await import('./api/status.js')).default,
  '/api/voice-preview': (await import('./api/voice-preview.js')).default,
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const handler = routes[url.pathname];
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res; };
  res.send = buf => { res.end(buf); return res; };
  if (!handler) return res.status(404).json({ error: 'not_found' });
  req.query = Object.fromEntries(url.searchParams);
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
  try { await handler(req, res); } catch (e) { res.status(500).json({ error: String(e) }); }
}).listen(8096, () => console.log('kiosk api on http://localhost:8096'));
