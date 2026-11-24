// Temporary diagnostic (probe branch only). Pulls Disney's own dining list and
// checks every restaurant the scanner does not track yet.
import { getMenu, VENUES } from './scan-lib.mjs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const KNOWN = new Set(["africa-outpost", "afternoon-tea", "amorettes-patisserie-cake-decorating-experience", "ample-hills-creamery", "aristocrepes", "bar-riva", "barcelona-lounge", "beastly-kiosk", "beatrix", "big-river-grille-and-brewing-works", "bongos-cuban-cafe-express", "breakfast-with-goofy-ravello", "broadway-concert-series-dining-package", "cake-bake-shop-roses-of-gold-afternoon-tea", "candlelight-dinner-packages", "centertown-market", "chef-table-at-victoria-and-alberts", "city-works-eatery-and-pour-house", "cool-ship", "crepes-des-chefs-de-france", "dahlia-lounge", "dino-bite-snacks", "dino-diner", "downtown-snow-company", "electric-umbrella-restaurant", "enchanted-rose", "epic-eats", "espn-club", "espn-wide-world-sports-grill", "fantasmic-dining-package", "food-trucks", "food-wine-concert-series-dining-package", "food-wine-marketplaces", "gasparilla-grill-and-games", "gelateria-toscana", "gelati", "geo-82-fireworks-experience", "gideons-bakehouse", "hoop-dee-doo-musical-revue", "karamell-kuche", "kimonos", "kimonos-lounge", "krnr-the-rock-station", "la-creperie-de-paris", "le-petit-cafe", "macguffins", "mama-melrose-ristorante-italiano", "mickeys-very-merry-christmas-party-plaza-view", "monsieur-paul", "p-and-js-southern-takeout", "picabu", "pizzerizzo", "primo-piatto", "promenade-refreshments", "rainforest-safari-bar", "refreshment-port", "regal-eagle-smokehouse", "restaurant-marrakesh", "restaurantosaurus", "rose-and-crown-pub-and-dining-room", "roundup-rodeo-bbq", "salt-and-straw", "sebastians-bistro", "shiki-sai", "shula-lounge", "shula-steak-house", "space-220", "space-220-lounge", "sprinkles", "steakhouse-71", "steakhouse-71-lounge", "summer-house-on-the-lake", "sunshine-day-cafe", "takumi-tei", "the-ganachery", "the-market", "thirsty-river-bar-trek-snacks", "three-bridges-bar-and-grill", "tianas-palace", "tokyo-dining", "tomorrowland-terrace-restaurant", "topolinos-terrace", "trilo-bites", "upcountry", "victoria-and-alberts", "victoria-and-alberts-queen-victoria-room", "wailulu-bar-and-grill", "wave-lounge", "wave-restaurant-of-american-flavors", "weinkeller", "westward-ho", "wolfgang-puck-express-disney-springs-marketplace", "wolfgang-puck-express-downtown-disney-marketplace", "wolfgang-puck-express-marketplace"]);
const tracked = new Set(VENUES.map((v) => v[0]));
const today = new Date().toISOString().slice(0, 10);

function tally(json) {
  let priced = 0, text = 0; const periods = [];
  for (const mp of json?.mealPeriods || []) {
    periods.push(`${mp?.label || mp?.name}:${mp?.serviceStyle || '?'}`);
    for (const g of mp?.groups || []) for (const it of g?.items || []) {
      if ((it?.prices || []).some((x) => typeof x?.withoutTax === 'number')) priced++;
      else if (/^\s*\$\s?\d+(\.\d+)?\s+per\s/i.test(String(it?.title || ''))) text++;
    }
  }
  return `priced=${priced}|text=${text}|${periods.join(';')}`;
}

const found = new Map();
for (const cfg of ['dining', 'restaurants', 'dining-events']) {
  const url = `https://disneyworld.disney.go.com/finder/api/v1/explorer-service/list-ancestor-entities/wdw/80007798;entityType=destination/${today}/${cfg}`;
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', 'accept-language': 'en-US,en;q=0.9' } });
    const body = await res.text();
    console.log(`FINDER ${cfg} status=${res.status} bytes=${body.length} head=${body.slice(0, 120).replace(/\s+/g, ' ')}`);
    if (!res.ok || body.trimStart().startsWith('<')) continue;
    const json = JSON.parse(body);
    const results = json?.results || [];
    console.log(`FINDER ${cfg} results=${results.length} keys=${Object.keys(results[0] || {}).join(',')}`);
    const typeCount = {};
    for (const r of results) {
      typeCount[r?.entityType] = (typeCount[r?.entityType] || 0) + 1;
      if (r?.urlFriendlyId) found.set(r.urlFriendlyId, { name: r.name, loc: r.locationName, type: r.entityType, url: r.url || r.webLink || '' });
    }
    console.log('FINDER types', JSON.stringify(typeCount));
    if (results.length) console.log('FINDER sample', JSON.stringify(results[0]).slice(0, 700));
    if (found.size) break;
  } catch (err) { console.log(`FINDER-FAIL ${cfg} ${err.message}`); }
}
console.log(`FINDER unique slugs=${found.size} tracked-hit=${[...found.keys()].filter((s) => tracked.has(s)).length}`);
const trackedMissing = [...tracked].filter((s) => !found.has(s));
console.log(`TRACKED-NOT-IN-FINDER ${trackedMissing.length}: ${trackedMissing.join(' ')}`);
const todo = [...found].filter(([s]) => !tracked.has(s) && !KNOWN.has(s));
console.log(`NEW candidates=${todo.length}`);
let i = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (i < todo.length) {
    const [slug, meta] = todo[i++];
    try { const j = await getMenu(slug); console.log(`CAND|${slug}|${j?.name}|loc=${j?.location}|${tally(j)}`); }
    catch (err) { console.log(`CAND-FAIL|${slug}|${meta.name}|${meta.loc}|${err.message}`); }
  }
}));
for (const s of KNOWN) if (found.has(s)) console.log(`KNOWN-IN-FINDER|${s}|${found.get(s).name}|${found.get(s).loc}`);
