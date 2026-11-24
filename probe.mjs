// Temporary diagnostic (probe branch only). Sweeps every tracked venue plus
// sitemap/manual candidates and prints where fixed prices live as text.
import { getMenu, VENUES } from './scan-lib.mjs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const MANUAL = `epcot/space-220 epcot/space-220-lounge epcot/regal-eagle-smokehouse epcot/shiki-sai epcot/takumi-tei epcot/la-creperie-de-paris epcot/monsieur-paul epcot/gelateria-toscana epcot/karamell-kuche epcot/weinkeller epcot/refreshment-port epcot/restaurant-marrakesh epcot/tokyo-dining
hollywood-studios/roundup-rodeo-bbq hollywood-studios/pizzerizzo hollywood-studios/mama-melrose-ristorante-italiano hollywood-studios/epic-eats hollywood-studios/the-market
magic-kingdom/tomorrowland-terrace-restaurant magic-kingdom/cool-ship magic-kingdom/westward-ho magic-kingdom/tianas-palace
animal-kingdom/trilo-bites animal-kingdom/restaurantosaurus
contemporary-resort/steakhouse-71 contemporary-resort/steakhouse-71-lounge
riviera-resort/topolinos-terrace riviera-resort/primo-piatto riviera-resort/le-petit-cafe riviera-resort/bar-riva
caribbean-beach-resort/sebastians-bistro caribbean-beach-resort/centertown-market
coronado-springs-resort/three-bridges-bar-and-grill coronado-springs-resort/dahlia-lounge coronado-springs-resort/barcelona-lounge
grand-floridian-resort-and-spa/victoria-and-alberts grand-floridian-resort-and-spa/enchanted-rose
polynesian-resort/wailulu-bar-and-grill
disney-springs/summer-house-on-the-lake disney-springs/gideons-bakehouse disney-springs/city-works-eatery-and-pour-house disney-springs/salt-and-straw disney-springs/the-ganachery disney-springs/beatrix`.split(/\s+/);

const tracked = new Set(VENUES.map((v) => v[0]));
const types = new Map();
let multiShown = 0;

function report(tag, area, slug, json) {
  let priced = 0, text = 0;
  const seen = new Set();
  const periods = [];
  for (const mp of json?.mealPeriods || []) {
    const period = mp?.label || mp?.name || '';
    periods.push(`${period}:${mp?.serviceStyle || '?'}`);
    for (const g of mp?.groups || []) {
      const gname = String(g?.name || '').trim();
      if (/\$\s?\d/.test(gname) && !seen.has('G' + gname)) { seen.add('G' + gname); console.log(`GRP|${slug}|${period}|${gname}`); }
      for (const it of g?.items || []) {
        const prices = it?.prices || [];
        const title = String(it?.title || '').trim();
        for (const p of prices) types.set(p?.type, (types.get(p?.type) || 0) + 1);
        if (prices.some((x) => typeof x?.withoutTax === 'number')) {
          priced++;
          if (prices.length > 1 && multiShown < 60) { multiShown++; console.log(`MULTI|${slug}|${title}|${JSON.stringify(prices)}`); }
        } else if (/\$\s?\d/.test(title) || /\bper (adult|child|person|guest)\b/i.test(title)) {
          text++;
          const k = period + '|' + gname + '|' + title;
          if (!seen.has(k)) { seen.add(k); console.log(`TXT|${slug}|${period}|${gname}|${title}`); }
        }
        if (it?.pricesRange) console.log(`RNG|${slug}|${title}|${JSON.stringify(it.pricesRange).slice(0, 200)}`);
      }
    }
  }
  console.log(`${tag}|${area}/${slug}|${json?.name}|loc=${json?.location}|priced=${priced}|text=${text}|${periods.join(';')}`);
}

async function pool(list, fn, n = 4) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) { const x = list[i++]; await fn(x); } }));
}

// 1. Candidates: sitemap pairs not tracked, plus the manual list.
const cands = new Map();
try {
  const res = await fetch('https://disneyworld.disney.go.com/sitemap.xml', { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' } });
  const xml = await res.text();
  console.log(`SITEMAP status=${res.status} bytes=${xml.length}`);
  for (const m of xml.matchAll(/disneyworld\.disney\.go\.com\/dining\/([a-z0-9-]+)\/([a-z0-9-]+)\//g)) {
    if (!tracked.has(m[2])) cands.set(m[2], m[1]);
  }
  console.log(`SITEMAP untracked pairs=${cands.size}`);
} catch (err) { console.log('SITEMAP-FAIL', err.message); }
for (const c of MANUAL) { const [a, s] = c.split('/'); if (!tracked.has(s) && !cands.has(s)) cands.set(s, a); }

await pool([...cands], async ([slug, area]) => {
  try { report('CAND', area, slug, await getMenu(slug)); }
  catch (err) { console.log(`CAND-FAIL|${area}/${slug}|${err.message}`); }
});

// 2. Every tracked venue.
await pool(VENUES, async ([slug, , area]) => {
  try { report('V', area, slug, await getMenu(slug)); }
  catch (err) { console.log(`V-FAIL|${area}/${slug}|${err.message}`); }
});
console.log('TYPES', JSON.stringify([...types]));
