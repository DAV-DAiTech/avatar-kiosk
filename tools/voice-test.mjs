// End-to-end test of a voice question, with no microphone and no credits.
// Opens a throwaway Chrome whose fake microphone plays tools/question.wav
// ("Học viện ngoại giao ở đâu?"), starts a sandbox session, taps to talk, taps
// to send, and prints what the avatar heard and answered. Screenshots go to /tmp.
//
//   python3 -m http.server 8095        # in the repo root, in another terminal
//   node tools/voice-test.mjs [horizontal|vertical]
//
// Needs Node 22+ and Google Chrome (set CHROME=/path/to/chrome if it isn't the macOS default).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const layout = process.argv[2] || 'horizontal';
const page = process.env.PAGE || 'http://localhost:8095/';
const chromePath = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const wav = join(dirname(fileURLToPath(import.meta.url)), 'question.wav');
const out = mkdtempSync(join(tmpdir(), 'kiosk-test-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(chromePath, [
  '--remote-debugging-port=9333', `--user-data-dir=${out}/profile`, '--no-first-run', '--no-default-browser-check',
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`,
  // Without these the fake microphone stays silent on macOS.
  '--disable-features=AudioServiceSandbox,AudioServiceOutOfProcess',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  layout === 'vertical' ? '--window-size=540,960' : '--window-size=1280,720', 'about:blank',
], { stdio: 'ignore' });

const t0 = Date.now();
const stamp = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
let target;
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find(t => t.type === 'page'); } catch {}
  if (!target) await sleep(300);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let id = 0; const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.consoleAPICalled') {
    const t = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
    if (/user:|avatar:|ptt|asked|start failed/.test(t)) console.log(stamp(), t.slice(0, 220));
  }
};
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const tap = () => ev(`document.getElementById('ptt').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`);
const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 75 });
  writeFileSync(join(out, name), Buffer.from(r.result.data, 'base64'));
};

try {
  await send('Runtime.enable');
  await send('Page.navigate', { url: `${page}?sandbox&layout=${layout}` });
  await sleep(3000);
  await ev(`document.getElementById('saveBtn').click()`);              // first visit opens setup
  await sleep(1500);
  await tap();                                                         // start a session
  for (let i = 0; i < 120 && !/st-live/.test(await ev('document.body.className')); i++) await sleep(250);
  for (let i = 0; i < 40 && !/"mic":"ACTIVE"/.test(await ev('JSON.stringify(kioskState())')); i++) await sleep(250);
  console.log(stamp(), 'live');
  await sleep(1500);
  await tap(); console.log(stamp(), 'tap 1: listening');
  await sleep(9000);                                                   // the clip loops; this catches it once
  await tap(); console.log(stamp(), 'tap 2: sent');
  await sleep(16000);
  await shot('live.jpg');
  console.log(stamp(), 'conversation', JSON.stringify(await ev(
    `[...document.querySelectorAll('#chat .msg')].map(m => m.className.slice(4) + ': ' + m.querySelector('.txt').textContent)`), null, 1));
  await ev(`document.getElementById('endBtn').click()`);
  await sleep(2000);
  console.log('screenshots in', out);
} finally {
  ws.close(); chrome.kill();
}
