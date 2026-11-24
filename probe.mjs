// Temporary diagnostic: prints the shape of the menu feed for a few venues so
// fixed-price (buffet / prix fixe) pricing can be located. Not part of the scan.
import { getMenu } from './scan-lib.mjs';

const SLUGS = (process.env.PROBE_SLUGS ||
  'tusker-house-restaurant chef-mickeys space-220 space-220-restaurant space-220-lounge ravello chefs-de-france').split(/\s+/);

const short = (v, n = 160) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > n ? s.slice(0, n) + '…' : s;
};

function schema(node, path, out) {
  if (Array.isArray(node)) {
    if (!node.length) bump(out, path + '[] (empty)', null);
    node.forEach((n) => schema(n, path + '[]', out));
    return;
  }
  if (node && typeof node === 'object') {
    const entries = Object.entries(node);
    if (!entries.length) bump(out, path + ' {} (empty)', null);
    for (const [k, v] of entries) schema(v, path ? path + '.' + k : k, out);
    return;
  }
  bump(out, path, node);
}
function bump(out, path, value) {
  const e = out.get(path) || { n: 0, samples: new Set() };
  e.n++;
  if (e.samples.size < 4 && value !== null && value !== '') e.samples.add(short(value, 90));
  out.set(path, e);
}

const without = (obj, key) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => k !== key));

for (const slug of SLUGS) {
  console.log(`\n===== PROBE ${slug} =====`);
  let json;
  try { json = await getMenu(slug); } catch (err) { console.log(`PROBE-FAIL ${slug}: ${err.message}`); continue; }
  console.log('NAME', json?.name, '| bytes', JSON.stringify(json).length);
  console.log('TOP', short(without(json, 'mealPeriods'), 1500));
  const out = new Map();
  schema(json, '', out);
  for (const [p, e] of out) console.log(`PATH ${p} x${e.n} :: ${[...e.samples].join(' | ')}`);
  for (const mp of json?.mealPeriods || []) {
    console.log('MP', short(without(mp, 'groups'), 800));
    for (const g of mp?.groups || []) {
      const items = g?.items || [];
      const priced = items.filter((i) => (i?.prices || []).some((x) => typeof x?.withoutTax === 'number')).length;
      console.log('  GROUP', short(without(g, 'items'), 500), `items=${items.length} priced=${priced}`);
      const odd = items.filter((i) => !(i?.prices || []).length ||
        /adult|child|buffet|prix|pricing|per person|per guest|all-you-care/i.test(String(i?.title || '') + ' ' + String(g?.name || '')));
      for (const i of odd.slice(0, 3)) console.log('    ITEM', short(i, 900));
    }
  }
}
