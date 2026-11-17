# vendor/

`liveavatar-web-sdk-0.0.20.min.js` is the official LiveAvatar Web SDK
([@heygen/liveavatar-web-sdk](https://www.npmjs.com/package/@heygen/liveavatar-web-sdk) 0.0.20, MIT, © HeyGen)
bundled into one ES module with its dependencies (livekit-client, Apache-2.0; events, MIT).
It's kept in the repo so the kiosk doesn't depend on a third-party CDN during an event.

Rebuild:

```bash
npm i @heygen/liveavatar-web-sdk@0.0.20 esbuild
echo "export { LiveAvatarSession, SessionEvent, AgentEventsEnum, SessionState, SessionDisconnectReason, SessionInteractivityMode, VoiceChatState } from '@heygen/liveavatar-web-sdk';" > entry.js
npx esbuild entry.js --bundle --format=esm --minify --target=es2020 --legal-comments=eof --outfile=liveavatar-web-sdk-0.0.20.min.js
```
