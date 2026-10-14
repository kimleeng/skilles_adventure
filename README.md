# Skille’s Adventure

A mysterious, single-screen underwater game made in TypeScript. Guide a big pixel art turtle through a forgotten aquarium, catch pink shrimp, and dodge drifting bottles, cans, and bags. You have three hearts. After ten minutes of active play, a golden shrimp appears in the sunken arch; catch it to finish the adventure.

All artwork is drawn locally on the canvas. No API keys, backend, external fonts, or `.env` file are needed.

## Development

Use Node.js 24 (pinned in `.node-version` and `.nvmrc`; Node 24 or newer is supported). If you use nvm, run `nvm install` and `nvm use` in the repository first.

```sh
git clone https://github.com/kimleeng/skilles_adventure.git
cd skilles_adventure
npm ci
npm run dev
```

Open the local address printed by Vite in your browser; the development server uses port 5173. If you already have a checkout, run `git pull` before installing dependencies.

In the managed cloud environment, keep npm's cache in a writable location:

```sh
npm --cache /workspace/.cache/npm ci
```

## Controls

- **Mouse:** move your pointer through the aquarium. Skille follows smoothly.
- **Touch:** tap or drag through the water.
- **Keyboard:** arrow keys or WASD to swim, P or Escape to pause or resume.
- **Sound:** optional, enabled with the sound button.

Trash costs one heart and grants two seconds of protection. Leaving the tab pauses the game. Catching shrimp increases your score; the best score is stored locally when browser storage is available. Replay starts a fresh ten-minute round.

## Checks and build

```sh
npm test                 # Game rules: movement, health, collection, timing, pause, replay
npm run build            # Strict TypeScript check and production build
npm run test:browser     # Actual mouse, keyboard, touch, pause, help, and sound interaction
npm run preview          # Serve the production output on port 4173
```

To install the browser for automated checks on your local machine, run this once:

```sh
npx playwright install chromium
npm run test:browser
```

The tests reuse system Chromium at `/usr/bin/chromium` when available; otherwise they use Playwright's installed Chromium. You can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use another Chromium/Chrome executable. Playwright starts the development server when needed. Browser installation is only needed for automated browser checks; you can play the game in your regular browser with `npm run dev`.

Production output is in `dist/` and can be served as a static website. Live development processes must restart in each new cloud task; installed dependencies and files can be retained in the environment snapshot.
