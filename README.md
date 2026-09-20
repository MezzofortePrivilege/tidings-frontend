# Tidings — Frontend (public)

Public single-page app for **Tidings**, the PR relationships and reporting
platform by Swell PR & Communications. No build step — plain HTML/CSS/JS.

## Run

Serve this folder statically, e.g.:

```bash
npm run serve       # or: npx serve . / python3 -m http.server
```

## Point it at a backend

The app talks to the private Tidings API. Resolution order:

1. `window.TIDINGS_API` from `config.js`
   (`cp config.example.js config.js`, then set the URL)
2. A URL saved via the **Backend URL** button in the Portfolio tab
3. Same origin (when served by the backend itself)

Demo login (against the seeded backend): `demo@tidings.app` / `demo123`

## Tabs

Dashboard · Capture · Journalists · Clients · Campaigns · Coverage ·
Import · Reports · Portfolio · Journalist Portal
