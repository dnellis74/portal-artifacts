# Cosmic Carnival

Cosmic Carnival is a standalone Three.js lane shooter built for the Portal Artifacts host. The editable TypeScript/Vite project lives here; its checked-in production build is generated at `../../public/cosmic-carnival/`.

## Run locally

Node.js 22 or newer is recommended.

```sh
npm ci --include=dev
npm run dev
```

Vite serves the game at `http://localhost:5173/cosmic-carnival/`. To check the production build:

```sh
npm run test
npm run build
npm run preview -- --port 4173
```

Open `http://localhost:4173/cosmic-carnival/`.

## Controls

- Left/right arrows or A/D: move around the twelve-lane rim.
- Space: hold to fire inward.
- Focused mouse wheel: advance lanes.
- Enter/click: start or restart.
- Escape: pause or resume.
- M: mute.
- Touch: left, fire, and right controls appear on coarse-pointer devices.

An enemy that reaches the rim costs one life. Prisms take one hit, Ribbons change lane at deterministic depths, and Jesters take two hits and surge near the rim. The first six waves are tuned, followed by deterministic endless schedules with capped speed and spacing.

## Assets and storage

The four supplied GLBs in `public/models/` are loaded once and used directly for the Crescent player and all three enemy roles. They contain no external textures. Archivo Black is bundled locally through `@fontsource`; all runtime dependencies are bundled and model and font loading makes no external requests.

The local high score, mute preference, and low-effects preference are stored on this device. Optional Portal-ranked play uses a game-scoped HttpOnly session and the same-origin `/leaderboard-api/cosmic-carnival/` API. Guest play remains available without the service; sandboxed embeds remain guests. See `../../services/leaderboards/README.md` for deployment and validation limits.
