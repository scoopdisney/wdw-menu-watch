import fs from 'node:fs/promises';
import {
  VENUES, TODAY, NOW, HEADER, LOG_HEADER,
  getMenu, collectVenue, keyOf, toCsv, parseCsv, readIfExists,
} from './scan-lib.mjs';

const current = [];
const failures = [];
const counts = new Map();

// WDW has ~300 venues, so fetch a few at a time instead of strictly one by one.
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const results = new Array(VENUES.length);
let next = 0;
async function worker() {
  while (next < VENUES.length) {
    const i = next++;
    const [slug, park, parkSlug] = VENUES[i];
    try {
      results[i] = { rows: collectVenue(await getMenu(slug), park, parkSlug, slug), slug };
    } catch (err) {
      results[i] = { error: `${slug}: ${err.message}` };
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
for (const r of results) {
  if (r.error) { failures.push(r.error); continue; }
  current.push(...r.rows);
  counts.set(r.rows[0]?.Restaurant || r.slug, r.rows.length);
}

const MIN_ROWS = Number(process.env.MIN_ROWS || 12000);
if (failures.length > 15 || current.length < MIN_ROWS) {
  await fs.mkdir('.', { recursive: true });
  await fs.writeFile('summary.md', `## Menu scan ${NOW} UTC — ABORTED\n\nOnly ${current.length} rows and ${failures.length} venue failures. Snapshot left untouched.\n\n${failures.map((f) => '- ' + f).join('\n')}\n`);
  await fs.writeFile('POST_COMMENT', '1');
  console.log('Aborted: incomplete pull');
  process.exit(0);
}

await fs.mkdir('data', { recursive: true });
const prevText = await readIfExists('data/current.csv');
const previous = prevText ? parseCsv(prevText) : [];

const group = (rows) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};

const bMap = group(previous);
const cMap = group(current);
const changes = [], flags = [], added = [], removed = [];

for (const [k, bRows] of bMap) {
  const cRows = cMap.get(k);
  if (!cRows) { removed.push(...bRows); continue; }
  if (bRows.length === 1 && cRows.length === 1) {
    const o = Number(bRows[0].Price), n = Number(cRows[0].Price);
    if (o !== n) {
      changes.push({
        Detected: NOW, Restaurant: cRows[0].Restaurant, Park: cRows[0].Park, Item: cRows[0].Item,
        Category: cRows[0].Category, 'Old Price': o.toFixed(2), 'New Price': n.toFixed(2),
        Change: (n - o).toFixed(2), Percent: (((n - o) / o) * 100).toFixed(1) + '%', Source: cRows[0].Source,
      });
    }
  } else {
    for (const b of bRows) {
      const near = cRows.reduce((a, c) => (Math.abs(+c.Price - +b.Price) < Math.abs(+a.Price - +b.Price) ? c : a));
      if (Number(near.Price) !== Number(b.Price)) {
        flags.push(`${b.Restaurant} — ${b.Item}: ${b.Price} vs nearest ${near.Price} (${cRows.length} rows share this name)`);
      }
    }
  }
}
for (const [k, cRows] of cMap) if (!bMap.has(k)) added.push(...cRows);

const prevCounts = new Map();
for (const r of previous) prevCounts.set(r.Restaurant, (prevCounts.get(r.Restaurant) || 0) + 1);
const countDeltas = [];
for (const [venue, n] of counts) {
  const was = prevCounts.get(venue);
  if (was !== undefined && was !== n) countDeltas.push(`${venue}: ${was} → ${n}`);
}

await fs.writeFile('data/current.csv', toCsv(current, HEADER));
// Also split by area so the park files stay a manageable size.
const PARK_FILES = {
  'magic-kingdom': 'magic-kingdom.csv', 'epcot': 'epcot.csv', 'hollywood-studios': 'hollywood-studios.csv',
  'animal-kingdom': 'animal-kingdom.csv', 'disney-springs': 'disney-springs.csv',
};
const buckets = new Map();
for (const r of current) {
  const area = r.Source.split('/')[0];
  const file = PARK_FILES[area] || (area === 'typhoon-lagoon' || area === 'blizzard-beach' ? 'water-parks.csv' : 'resorts.csv');
  if (!buckets.has(file)) buckets.set(file, []);
  buckets.get(file).push(r);
}
for (const [file, rows] of buckets) await fs.writeFile('data/' + file, toCsv(rows, HEADER));

if (changes.length) {
  const logText = await readIfExists('data/price-changes.csv');
  const existing = logText ? parseCsv(logText) : [];
  await fs.writeFile('data/price-changes.csv', toCsv([...existing, ...changes], LOG_HEADER));
}

const money = (c) => `- **${c.Restaurant}** — ${c.Item}: $${c['Old Price']} → $${c['New Price']} (${c.Change > 0 ? '+' : ''}${c.Change}, ${c.Percent})`;
const lines = [];

// Daily summary marker: post one summary per calendar day regardless of which
// scheduled slot actually ran (GitHub drifts cron runs), then record the date.
const lastDaily = ((await readIfExists('data/last-daily.txt')) || '').trim();
const isDailySlot = lastDaily !== TODAY;

lines.push(`## Menu scan ${NOW} UTC`);
lines.push('');
lines.push(`${current.length} rows across ${VENUES.length} WDW venues${failures.length ? `, ${failures.length} venue failure(s)` : ', 0 failures'}.`);
lines.push('');

if (!previous.length) {
  lines.push('First run — baseline established. Nothing to diff against yet.');
} else if (!changes.length && !added.length && !removed.length) {
  if (isDailySlot) {
    lines.push('**Daily check complete — no changes.**');
  } else {
    lines.push('**No changes.** No price moves, no items added or removed.');
  }
} else {
  if (changes.length) {
    const up = changes.filter((c) => +c.Change > 0).length;
    lines.push(`### ${changes.length} price change${changes.length > 1 ? 's' : ''} (${up} up, ${changes.length - up} down)`);
    lines.push(...changes.map(money));
    lines.push('');
  } else {
    lines.push('No price changes.');
    lines.push('');
  }
  if (added.length) {
    lines.push(`### ${added.length} new item${added.length > 1 ? 's' : ''}`);
    lines.push(...added.slice(0, 40).map((r) => `- **${r.Restaurant}** — ${r.Item} ($${r.Price})`));
    if (added.length > 40) lines.push(`- …and ${added.length - 40} more`);
    lines.push('');
  }
  if (removed.length) {
    lines.push(`### ${removed.length} item${removed.length > 1 ? 's' : ''} gone`);
    lines.push(...removed.slice(0, 40).map((r) => `- **${r.Restaurant}** — ${r.Item} (was $${r.Price})`));
    if (removed.length > 40) lines.push(`- …and ${removed.length - 40} more`);
    lines.push('');
  }
}

if (countDeltas.length) {
  lines.push('### Venue count changes');
  lines.push(...countDeltas.map((d) => `- ${d}`));
  lines.push('');
}
if (flags.length) {
  lines.push('### Ambiguity flags (not counted as changes)');
  lines.push(...flags.map((f) => `- ${f}`));
  lines.push('');
}
if (failures.length) {
  lines.push('### Venue failures');
  lines.push(...failures.map((f) => `- ${f}`));
  lines.push('');
}

lines.push('---');
lines.push('_Renames are invisible to name matching, so an item Disney renamed alongside a price change will not appear above._');

const hasNews = !previous.length || changes.length > 0 || added.length > 0 || removed.length > 0 || failures.length > 0;
const shouldPost = hasNews || isDailySlot;
if (shouldPost) await fs.writeFile('POST_COMMENT', '1');
if (isDailySlot) await fs.writeFile('data/last-daily.txt', TODAY + '\n');

await fs.writeFile('summary.md', lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(shouldPost ? (hasNews ? 'NEWS: comment will post' : 'DAILY: comment will post') : 'QUIET: no comment this run');
