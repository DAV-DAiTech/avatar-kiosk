// GET /api/voice-preview?id=<voice id>  → audio/mpeg sample (setup screen's "Nghe thử")
import { VOICES, cors, la, fail } from '../lib/liveavatar.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const id = String((req.query && req.query.id) || '');
  if (!VOICES.some(v => v.id === id)) return res.status(404).json({ error: 'unknown_voice' });
  try {
    const j = await la('GET', '/v1/voices/' + id + '/preview');
    const audio = Buffer.from(j.data.audio_base64, 'base64');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(audio);
  } catch (err) {
    fail(res, err);
  }
}
