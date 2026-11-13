# DAV Avatar Kiosk

A wrapper page around the LiveAvatar iframe embed. It shows a free idle screen until someone taps, then runs a live session with a time limit, and goes back to idle on its own. Credits are only used while a session is live: ending a session removes the iframe, which closes the stream.

## Two layouts

| URL | Screen | Avatar |
|---|---|---|
| `index.html?layout=vertical` | Portrait 9:16 | Full body, fills the screen |
| `index.html?layout=horizontal` | Landscape 16:9 | Half body on the left, panel with suggested questions on the right |

Each layout saves its own embed, session length, zoom and idle video on the device, so the two screens can use different avatars.

- **Vertical:** pick a full-body avatar in LiveAvatar. The wrapper can't create legs that a half-body avatar doesn't have.
- **Horizontal:** with a tall full-body avatar, set **orientation = Vertical** and **zoom = 2** in setup. This shows head to waist and fills the left side. A wide half-body avatar can use orientation = Match and zoom = 1.

The wrapper adds `?orientation=` to the LiveAvatar embed URL from each layout's setting. If it's left on "Match", the vertical layout gets `vertical` and the horizontal layout gets `horizontal`.

## How a visit works

1. **Idle** (free): your own screen or video with "Chạm để trò chuyện".
2. **Tap:** the LiveAvatar embed opens on its own pre-start screen (language picker plus **Chat now**). The countdown waits, and a "Nhấn Chat now" hint points at the button. If nobody taps within 45 s, the page goes back to idle.
3. **Tap inside the avatar** (normally Chat now): the session countdown starts, and zoom is applied. Zoom waits until now so the Chat now bar is never cropped off.
4. **Time up / End / Esc:** the iframe is removed (the stream stops), a thank-you screen shows, then the page goes back to idle.

## Setup (no API key needed)

1. In app.liveavatar.com: Avatar → **Embed** → choose the context, set the time limit → copy the HTML snippet.
2. Open the page → the setup screen appears → choose the layout → paste the snippet → **Save & start kiosk**.
3. Reopen setup any time with `Shift+S` or `?setup`.

## Controls

| Input | Action |
|---|---|
| Tap the idle screen / Space / Enter | Start a session |
| End button / Esc | End the session |
| `Shift+S` | Setup |
| `Shift+D` or `?debug` | Debug log (also logs any messages the LiveAvatar iframe posts) |
| `?fill` | Stretch to the whole screen instead of keeping 9:16 / 16:9 |

## Dry run without credits

Use `?embed=http://localhost:8095/mock-avatar.html` to try the full flow with a placeholder avatar.

## Local test

```bash
python3 -m http.server 8095 --directory DAV-Avatar-Kiosk
```

## Kiosk mode (on the screen's computer)

Chrome in kiosk mode, mic allowed without a prompt:

```bash
google-chrome --kiosk --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required "https://<hosted-url>/index.html?layout=vertical"
```

On macOS, replace `google-chrome` with `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.

The mic needs HTTPS or localhost, so host the page on GitHub Pages (or similar) for the real kiosk.

## Idle video

Put an MP4 next to `index.html` (for example `idle-vertical.mp4` and `idle-horizontal.mp4`) and set it in setup. Frame it the same way as the live avatar so switching between idle and live looks smooth. If it's empty, an animated mic screen is shown instead.
