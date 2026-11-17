// GET /api/status → { credits_left, active_sessions, max_active, voices }
import { VOICES, MAX_ACTIVE, cors, la, countActiveSessions, fail } from '../lib/liveavatar.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'get_only' });
  try {
    const [credits, active] = await Promise.all([la('GET', '/v1/users/credits'), countActiveSessions()]);
    res.status(200).json({
      ok: true,
      credits_left: Number(credits.data && credits.data.credits_left),
      active_sessions: active,
      max_active: MAX_ACTIVE,
      voices: VOICES,
    });
  } catch (err) {
    fail(res, err);
  }
}
