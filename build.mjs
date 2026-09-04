// Vercel build wrapper: run the sweep, then publish the CSVs to public/ as a download page.
import fs from 'node:fs/promises';
await import('./scan.mjs');
await fs.mkdir('public', { recursive: true });
const files = (await fs.readdir('data')).filter((f) => f.endsWith('.csv')).sort();
for (const f of files) await fs.copyFile('data/' + f, 'public/' + f);
const summary = await fs.readFile('summary.md', 'utf8').catch(() => '');
await fs.writeFile('public/summary.md', summary);
const rows = await fs.readFile('data/current.csv', 'utf8');
const n = rows.split('\n').length - 2;
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
await fs.writeFile('public/index.html', `<!doctype html><meta charset="utf-8"><title>WDW Menu Watch</title>
<body style="font-family:system-ui;max-width:720px;margin:2rem auto;padding:0 1rem">
<h1>Walt Disney World Menu Watch</h1>
<p>Pulled ${stamp} UTC — ${n} priced rows. Source: disneyworld.disney.go.com dinemenu API.</p>
<ul>${files.map((f) => `<li><a href="${f}">${f}</a></li>`).join('')}<li><a href="summary.md">summary.md</a></li></ul>
<pre style="white-space:pre-wrap;background:#f4f4f4;padding:1rem">${summary.replace(/</g, '&lt;')}</pre></body>`);
console.log('PUBLISHED', files.join(' '), 'rows=' + n);
