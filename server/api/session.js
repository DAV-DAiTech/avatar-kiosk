// POST /api/session  → { session_token, session_id, max_session_duration, sandbox }
// Body (all optional): { minutes, language, voice, sandbox }
import {
  AVATAR_ID, CONTEXT_ID, SANDBOX_AVATAR_ID, VOICES, LANGUAGES, MAX_MINUTES, MAX_ACTIVE,
  cors, la, countActiveSessions, fail,
} from '../lib/liveavatar.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (cors(req, res, { requireOrigin: true })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'post_only' });

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const minutes = Math.min(MAX_MINUTES, Math.max(1, Number(body.minutes) || 5));
  const language = LANGUAGES.includes(body.language) ? body.language : 'vi';
  const voice = (VOICES.find(v => v.id === body.voice) || VOICES[0]).id;
  const sandbox = body.sandbox === true;
  // Sandbox sessions (free, test avatar) are capped at 60 s by LiveAvatar.
  const pageSeconds = sandbox ? 55 : minutes * 60;
  const serverSeconds = sandbox ? 60 : Math.min(MAX_MINUTES * 60, minutes * 60 + 20);

  try {
    if (!sandbox) {
      const active = await countActiveSessions();
      if (active >= MAX_ACTIVE) return res.status(429).json({ error: 'busy', active, max_active: MAX_ACTIVE });
    }
    const j = await la('POST', '/v1/sessions/token', {
      mode: 'FULL',
      avatar_id: sandbox ? SANDBOX_AVATAR_ID : AVATAR_ID,
      is_sandbox: sandbox,
      interactivity_type: 'PUSH_TO_TALK',
      // The page ends the session itself at `minutes`; this is the server-side
      // backstop (a few extra seconds so the page's goodbye is never cut off).
      max_session_duration: serverSeconds,
      avatar_persona: { voice_id: voice, context_id: CONTEXT_ID, language },
    });
    res.status(200).json({
      session_token: j.data.session_token,
      session_id: j.data.session_id,
      max_session_duration: pageSeconds,
      sandbox,
    });
  } catch (err) {
    fail(res, err);
  }
}
