# Habaro — Frontend (public)

Public single-page app for **Habaro**, the PR relationships and reporting
platform by Swell PR & Communications. No build step — plain HTML/CSS/JS.

## Run

Serve this folder statically, e.g.:

```bash
npm run serve       # or: npx serve . / python3 -m http.server
```

## Point it at a backend

The app talks to the private Habaro API. Resolution order:

1. `window.HABARO_API` from `config.js`
   (`cp config.example.js config.js`, then set the URL — on Vercel the
   `HABARO_API` / legacy `TIDINGS_API` env var is baked in at build)
2. A URL saved locally (`habaro_api` in localStorage)
3. Same origin (when served by the backend itself)

Demo login (against the seeded backend): `demo@habaro.app` / `demo123`

## Tabs

Dashboard · Capture · Journalists · Clients · Campaigns · Coverage ·
Import · Reports · Portfolio · Journalist Portal
