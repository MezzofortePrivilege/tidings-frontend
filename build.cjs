// Build step for Vercel: writes config.js from the TIDINGS_API env var.
// Same-origin default when unset (backend-served mode).
const fs = require('fs');
const api = (process.env.TIDINGS_API || '').trim();
fs.writeFileSync('config.js', `// generated at deploy time — do not edit\nwindow.TIDINGS_API = ${JSON.stringify(api)};\n`);
console.log('config.js written, TIDINGS_API=' + (api || '(same-origin)'));
