# DAV Receptionist kiosk

An AI receptionist for the lobby screen, built on [LiveAvatar](https://app.liveavatar.com) (HeyGen). Open the link and it works: the DAV avatar is built in, so no embed link needs pasting.

Live: https://dav-daitech.github.io/avatar-kiosk/

- **Vertical (full body):** https://dav-daitech.github.io/avatar-kiosk/?layout=vertical
- **Horizontal (16:9):** https://dav-daitech.github.io/avatar-kiosk/?layout=horizontal

## Horizontal layout

The screen is split in half.

- **Left:** the avatar, with the full list of suggested questions beside it (42, in three groups: the Academy, alumni, the event and DAV Alumni Network; scrollable by finger or mouse wheel). Tapping a question asks it straight away (from the idle screen it starts a session first and cuts the greeting short); questions already asked in this visit get a ✓.
- **Right, idle:** the "Gương mặt Alumni", one person at a time: their portrait (cut out of the poster) with name, cohort and titles below, fading from one person to the next.
- **Right, during a session:** the conversation, one bubble per question and answer. It scrolls (finger or mouse wheel) to reread a long answer.
  - Answers are laid out for reading: the first sentence as a lead, the rest as bullet points, numbered lists ("1. … 2. …") as numbered items with a bold title and their points below, a programme by time slot ("07:30 - 08:30: … 08:30 - 10:30: …") as one item per slot, dates and times in gold, a closing question set apart. Only the display changes; the avatar still says the reply as written.
  - The text comes from LiveKit's transcript of the avatar's voice, so it appears word by word as the avatar speaks and is complete. (The SDK's own text chunks arrive sooner but drop words; they are only used if that transcript never shows up.)
  - The transcript has no line breaks, so the layout is read from punctuation. Answers that number their points with "1.", "2." and end each point with a full stop come out best.

## How a visit works

1. **Idle:** a still photo of the avatar with a big mic button. Uses no credits.
2. **Tap the button:** a session starts in about 5–10 s and the avatar greets the visitor.
3. **Tap to talk:** tap the button once and speak, then tap it again to send. The avatar answers straight away. Listening stops by itself after 30 s if nobody taps again. Tapping while the avatar is talking interrupts it. In the horizontal layout, a suggested question can be tapped instead.
4. **End:** the session ends after **5 minutes**, when the visitor taps **Kết thúc**, or after 60 s with nobody talking. A thank-you screen shows, then the idle photo returns.

Credits are used only between steps 2 and 4 (2 credits per minute). LiveAvatar also ends every session itself at the time limit (+20 s), even if the kiosk loses power or network.

## Editing

Everything is in this repository, so it can be edited from anywhere: in a cloud coding session, in the browser (press `.` on the GitHub page to open the editor), or locally. **A push to `main` updates the live page in about a minute.** Only changes inside `server/` also need a Vercel redeploy (see below).

| To change | Edit |
|---|---|
| The suggested questions | `QUESTIONS` in `index.html`: groups of questions, Vietnamese and English in the same order. Keep them to things the "DAV" context can answer. |
| The alumni shown | `assets/alumni/alumni.json`: one entry per person (`img`, `name`, `cohort`, `role`) in each group; portraits are transparent WebP in `assets/alumni/<group>/`. `interval_seconds` sets how long each person stays. To add someone from a new poster, `tools/alumni-extract.swift` cuts the person out and reads the text (see the top of that file). |
| What the avatar knows and says first | LiveAvatar → Contexts → "DAV". No code change. |
| Avatar size in the horizontal layout | `--av-h` (height) and `--av-l` (left edge) in `index.html`. |

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

- creates FULL-mode, **PUSH_TO_TALK** session tokens for avatar "daitechclub1 (Friendly)" with the "DAV" context;
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

The Vercel project (`hacktoded/dav-avatar-kiosk-api`) is **not** connected to GitHub, because a push would otherwise deploy the repo root, which has no API. Pushing to GitHub updates only the page. After changing anything in `server/`, redeploy it with `npx vercel deploy --prod --yes` from `server/`.

## Testing

**Run everything locally.** The local server reads the key from `.env`:

```bash
node server/dev.mjs                                        # API on :8096
python3 -m http.server 8095                                # page on :8095
open "http://localhost:8095/?api=http://localhost:8096"
```

**Test for free:** add `&sandbox` to any link. LiveAvatar's sandbox is free but only offers its sample avatar "Wayne" (a man), and sessions stop after 1 minute. Without `sandbox`, the DAV avatar is used and credits are spent.

**Test a spoken question without a microphone:** with the page served on :8095, run `node tools/voice-test.mjs horizontal`. A throwaway Chrome plays `tools/question.wav` into a fake microphone, taps to talk and to send, and prints the conversation (sandbox, no credits).

**Check credits and avatars:** run `./avatar-status.sh`. The setup screen also shows credits left.

## Kiosk mode (on the screen's computer)

Chrome in kiosk mode, mic allowed without a prompt:

```bash
google-chrome --kiosk --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required "https://dav-daitech.github.io/avatar-kiosk/?layout=vertical"
```

On macOS, replace `google-chrome` with `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. Use a good external mic. The mic only listens between the two taps, so lobby noise is ignored the rest of the time.

## Files

| File | What it is |
|---|---|
| `index.html` | The kiosk page |
| `assets/avatar-idle.jpg` | Idle photo (same framing as the live video) |
| `assets/alumni/` | Alumni portraits for the horizontal layout, and `alumni.json` with their names, cohorts and titles |
| `tools/alumni-extract.swift` | Cuts a person out of an alumni poster and reads its text (macOS) |
| `tools/voice-test.mjs` | End-to-end voice test with a fake microphone |
| `vendor/` | LiveAvatar Web SDK, bundled (see `vendor/README.md`) |
| `server/` | Token server: `api/session.js`, `api/status.js`, `api/voice-preview.js`, `dev.mjs` for local use |
| `avatar-status.sh` | Lists the account's avatars and their status |
| `legacy-embed.html` | The older iframe-embed version (needs an embed link), kept as a fallback |
