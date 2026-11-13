# DAV Avatar Kiosk

A wrapper page around the LiveAvatar iframe embed. The avatar waits on screen, a visitor taps **Chat now** once to talk, the session runs with a time limit, and the page resets itself for the next visitor. Ending a session removes the iframe, which closes the stream.

Live: https://dav-daitech.github.io/avatar-kiosk/ (GitHub Pages from `main`). The LiveAvatar embed link is **not** stored in this repo, because anyone with it can start sessions on the account's credits. Pass it with `?embed=` in a privately shared link, or paste it into the setup screen on the kiosk.

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

**One tap (default, `?start=one-tap`)**
1. **Idle:** LiveAvatar's own start screen: the avatar standing, with a language picker and **Chat now**. The wrapper adds the DAV name and a "Nhấn Chat now" hint on top. It reloads every 15 minutes so it never goes stale.
2. **Tap Chat now:** the session countdown starts, the End button appears, and zoom is applied. Zoom waits until now so the Chat now bar is never cropped off.
3. **Time up / End:** the iframe is removed (the stream stops), a thank-you screen shows, then a fresh avatar is waiting again.

LiveAvatar has no documented way to skip its Chat now button, and a page can't click inside another site's frame. One tap on Chat now is therefore the minimum with the iframe embed. True zero-button starts, such as starting on our own tap or with a motion sensor, would need LiveAvatar's Web SDK plus a small server that holds the API key.

**Two taps (`?start=two-tap`)**: shows our own idle screen or idle video first. A tap opens the embed on Chat now, and if nobody presses it within 45 s, the page goes back to idle.

A tap anywhere inside the avatar counts as the start, including the language picker, so the timer can start a few seconds early.

## Setup (no API key needed)

1. In app.liveavatar.com: Avatar → **Embed** → choose the context, set the time limit → copy the HTML snippet.
2. Open the page → the setup screen appears → choose the layout → paste the snippet → **Save & start kiosk**.
3. Reopen setup any time with `Shift+S` or `?setup`.

## Controls

| Input | Action |
|---|---|
| Chat now (one tap) / tap the idle screen, Space, Enter (two taps) | Start |
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

## Idle video (two-tap mode only)

Put an MP4 next to `index.html` (for example `idle-vertical.mp4` and `idle-horizontal.mp4`) and set it in setup. Frame it the same way as the live avatar so switching between idle and live looks smooth. If it's empty, an animated mic screen is shown instead.
