// Build step for Vercel: writes config.js from the HABARO_API env var
// (legacy alias TIDINGS_API still honoured — both resolve to the same API URL).
const fs = require('fs');
const api = (process.env.HABARO_API || process.env.TIDINGS_API || '').trim();
fs.writeFileSync('config.js', `// generated at deploy time - do not edit\nwindow.HABARO_API = ${JSON.stringify(api)};\n`);
console.log('config.js written, HABARO_API=' + (api || '(same-origin)'));
