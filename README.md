# DAV Receptionist kiosk

An AI receptionist for the lobby screen, built on [LiveAvatar](https://app.liveavatar.com) (HeyGen). Open the link and it works: the DAV avatar is built in, so no embed link needs pasting.

Live: https://dav-daitech.github.io/avatar-kiosk/

- **Vertical (full body):** https://dav-daitech.github.io/avatar-kiosk/?layout=vertical
- **Horizontal (half body + info panel):** https://dav-daitech.github.io/avatar-kiosk/?layout=horizontal

## How a visit works

1. **Idle:** a still photo of the avatar with a big mic button. Uses no credits.
2. **Tap the button:** a session starts in about 5–10 s and the avatar greets the visitor.
3. **Push to talk:** **hold** the button while speaking and **let go** to send. Alternatively, tap once, speak, then tap again. Pressing while the avatar is talking interrupts it. In the horizontal layout, the suggested questions can also be tapped.
4. **End:** the session ends after **5 minutes**, when the visitor taps **Kết thúc**, or after 60 s with nobody talking. A thank-you screen shows, then the idle photo returns.

Credits are used only between steps 2 and 4 (2 credits per minute). LiveAvatar also ends every session itself at the time limit (+20 s), even if the kiosk loses power or network.

## Setup screen

Shown on first visit. Reopen it with `Shift+S`, `?setup`, or by holding the top-left corner of the screen for 3 s.

- Layout: vertical / horizontal
- Session length: 3 / 5 / 10 / 15 / 20 minutes (default 5)
- Language: Vietnamese (default) / English / Multilingual
- Voice: Violetta A (default) / Violetta B, each with a ▶ preview button

The choice is saved on that machine. URL parameters override it: `layout`, `minutes`, `lang` (`vi`/`en`/`multi`), `fill` (stretch to the whole screen), `debug` (event log, also `Shift+D`).

## How it fits together

```
browser (GitHub Pages)  ──POST /api/session──▶  server/ (Vercel, holds API key)  ──▶  LiveAvatar API
        │                                         returns a one-session token
        └──────── video + mic (LiveKit/WebRTC, LiveAvatar Web SDK) ─────────────────▶  LiveAvatar
```

The LiveAvatar API key is **never** on the page. It lives only in Vercel's `LIVEAVATAR_API_KEY` environment variable, and locally in the git-ignored `.env`. The server:

- creates FULL-mode, **PUSH_TO_TALK** session tokens for avatar "DAV (Friendly)" with the "DAV" context;
- only answers pages from `dav-daitech.github.io` and localhost;
- refuses a new session while 3 are already running (`MAX_ACTIVE`), so a leaked page can't drain credits quickly.

The avatar, context, voices and limits are set in `server/lib/liveavatar.js` and can be overridden with environment variables (`AVATAR_ID`, `CONTEXT_ID`, `MAX_ACTIVE`, `MAX_MINUTES`, `ALLOWED_ORIGINS`). Edit the avatar's knowledge and greeting in LiveAvatar → Contexts → "DAV". No code change is needed.

### Deploy the server (Vercel)

```bash
cd server
npx vercel link --yes --project dav-avatar-kiosk-api
npx vercel env add LIVEAVATAR_API_KEY production --sensitive   # paste the key when asked
npx vercel deploy --prod --yes
```

The page calls `https://dav-avatar-kiosk-api.vercel.app` (set in `API_BASE_DEFAULT` in `index.html`).

## Testing

**Run everything locally.** The local server reads the key from `.env`:

```bash
node server/dev.mjs                                        # API on :8096
python3 -m http.server 8095                                # page on :8095
open "http://localhost:8095/?api=http://localhost:8096"
```

**Test for free:** add `&sandbox` to any link. LiveAvatar's sandbox is free but only offers its sample avatar "Wayne" (a man), and sessions stop after 1 minute. Without `sandbox`, the DAV avatar is used and credits are spent.

**Check credits and avatars:** run `./avatar-status.sh`. The setup screen also shows credits left.

## Kiosk mode (on the screen's computer)

Chrome in kiosk mode, mic allowed without a prompt:

```bash
google-chrome --kiosk --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required "https://dav-daitech.github.io/avatar-kiosk/?layout=vertical"
```

On macOS, replace `google-chrome` with `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. Use a good external mic. Push to talk ignores lobby noise between presses.

## Files

| File | What it is |
|---|---|
| `index.html` | The kiosk page |
| `assets/avatar-idle.jpg` | Idle photo (same framing as the live video) |
| `vendor/` | LiveAvatar Web SDK, bundled (see `vendor/README.md`) |
| `server/` | Token server: `api/session.js`, `api/status.js`, `api/voice-preview.js`, `dev.mjs` for local use |
| `avatar-status.sh` | Lists the account's avatars and their status |
| `legacy-embed.html` | The older iframe-embed version (needs an embed link), kept as a fallback |
