// Shared helpers for the kiosk's token server.
// The LiveAvatar API key lives only in the LIVEAVATAR_API_KEY environment
// variable on Vercel. It never reaches the browser: the kiosk page asks this
// server for a short-lived session token instead.

const API = 'https://api.liveavatar.com';

// IDs are not secrets (they are useless without the API key), so the
// defaults live here and can be overridden with environment variables.
export const AVATAR_ID = process.env.AVATAR_ID || '6125b86f-fff8-4f93-8897-2a698beffba9'; // "DAV (Friendly)"
export const CONTEXT_ID = process.env.CONTEXT_ID || '6679475a-99b0-40d1-8047-2e40c364a3d2'; // "DAV" (Phi persona + FAQ)
export const SANDBOX_AVATAR_ID = 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a'; // "Wayne", the only sandbox avatar

// Voices the kiosk may pick from (setup screen). First one is the default.
export const VOICES = [
  { id: '6a928a3e-8c89-458a-988e-879ee71635d2', name: 'Violetta A' },
  { id: '214c4905-3992-4083-91f4-dbeb130e766e', name: 'Violetta B' },
];
export const LANGUAGES = ['vi', 'en', 'multi'];

// Essential plan caps sessions at 20 minutes.
export const MAX_MINUTES = Number(process.env.MAX_MINUTES || 20);
// Refuse new sessions while this many are already running, so a leaked page
// can never burn more than MAX_ACTIVE × 2 credits per minute.
export const MAX_ACTIVE = Number(process.env.MAX_ACTIVE || 3);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://dav-daitech.github.io,http://localhost:8095,http://127.0.0.1:8095')
  .split(',').map(s => s.trim()).filter(Boolean);

/** Sets CORS headers. Returns true when the request has been fully answered. */
export function cors(req, res, { requireOrigin = false } = {}) {
  const origin = req.headers.origin;
  const allowed = origin && ALLOWED_ORIGINS.includes(origin);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') {
    res.status(allowed ? 204 : 403).end();
    return true;
  }
  if ((origin && !allowed) || (requireOrigin && !origin)) {
    res.status(403).json({ error: 'origin_not_allowed' });
    return true;
  }
  return false;
}

/** Calls the LiveAvatar API with the server's key. Returns the parsed JSON. */
export async function la(method, path, body) {
  const key = process.env.LIVEAVATAR_API_KEY;
  if (!key) throw Object.assign(new Error('LIVEAVATAR_API_KEY is not set'), { status: 500 });
  const r = await fetch(API + path, {
    method,
    headers: { 'X-API-KEY': key, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let json = null;
  try { json = await r.json(); } catch { /* non-JSON error page */ }
  if (!r.ok || (json && json.code && json.code >= 4000)) {
    const msg = (json && (json.message || JSON.stringify(json.detail || json))) || ('HTTP ' + r.status);
    throw Object.assign(new Error(msg), { status: r.status >= 400 ? r.status : 502 });
  }
  return json;
}

export async function countActiveSessions() {
  const j = await la('GET', '/v1/sessions?type=active&page_size=50');
  const list = (j.data && j.data.results) || [];
  return list.filter(s => !s.is_sandbox).length;
}

export function fail(res, err) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({ error: 'upstream_error', message: String(err.message || err).slice(0, 300) });
}
