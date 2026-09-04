// Walt Disney World Resort menu price watch (separate from the Disneyland tracker).
// Sweeps every priced venue Disney's WDW menu API serves (parks, Disney Springs, water parks, resort hotels),
// diffs against the committed snapshot,
// appends real price moves to data/price-changes.csv, writes summary.md.

import fs from 'node:fs/promises';

const API = 'https://disneyworld.disney.go.com/dining/dinemenu/api/menu?searchTerm=';

const AREA_NAMES = {
  'magic-kingdom': 'Magic Kingdom',
  'epcot': 'EPCOT',
  'hollywood-studios': "Disney's Hollywood Studios",
  'animal-kingdom': "Disney's Animal Kingdom",
  'disney-springs': 'Disney Springs',
  'typhoon-lagoon': 'Typhoon Lagoon',
  'blizzard-beach': 'Blizzard Beach',
  'all-star-movies-resort': 'All-Star Movies Resort',
  'all-star-music-resort': 'All-Star Music Resort',
  'all-star-sports-resort': 'All-Star Sports Resort',
  'animal-kingdom-lodge': 'Animal Kingdom Lodge',
  'animal-kingdom-villas-kidani': 'Animal Kingdom Villas - Kidani Village',
  'art-of-animation-resort': 'Art of Animation Resort',
  'beach-club-resort': 'Beach Club Resort',
  'boardwalk': 'BoardWalk',
  'boardwalk-inn': 'BoardWalk Inn',
  'cabins-at-fort-wilderness-resort': 'Fort Wilderness Resort',
  'caribbean-beach-resort': 'Caribbean Beach Resort',
  'contemporary-resort': 'Contemporary Resort',
  'coronado-springs-resort': 'Coronado Springs Resort',
  'dolphin-hotel': 'Walt Disney World Dolphin',
  'four-seasons': 'Four Seasons Resort Orlando',
  'grand-floridian-resort-and-spa': 'Grand Floridian Resort & Spa',
  'old-key-west-resort': 'Old Key West Resort',
  'polynesian-resort': 'Polynesian Village Resort',
  'pop-century-resort': 'Pop Century Resort',
  'port-orleans-resort-french-quarter': 'Port Orleans Resort - French Quarter',
  'port-orleans-resort-riverside': 'Port Orleans Resort - Riverside',
  'saratoga-springs-resort-and-spa': 'Saratoga Springs Resort & Spa',
  'swan-hotel': 'Walt Disney World Swan',
  'wilderness-lodge-resort': 'Wilderness Lodge',
  'yacht-club-resort': 'Yacht Club Resort',
};

const VENUE_LIST = `
magic-kingdom: aloha-isle auntie-gravitys-galactic-goodies be-our-guest-restaurant beak-barrel caseys-corner cheshire-cafe cinderella-royal-table columbia-harbour-house cosmic-ray-starlight-cafe crystal-palace diamond-horseshoe friars-nook gastons-tavern golden-oak-outpost jungle-navigation-skipper-canteen liberty-square-market liberty-tree-tavern lunching-pad main-street-bakery pecos-bill-tall-tale-inn-and-cafe pinocchio-village-haus plaza-ice-cream-parlor plaza-restaurant prince-eric-village-market sleepy-hollow storybook-treats sunshine-tree-terrace tonys-town-square-restaurant tortuga-tavern
epcot: akershus-royal-banquet-hall biergarten-restaurant block-hans cantina-de-san-angel cava-del-tequila chefs-de-france choza-de-margarita coral-reef-restaurant fife-and-drum-tavern funnel-cake garden-grill-restaurant geo-82-lounge hacienda-de-san-angel joy-of-tea kabuki-cafe katsura-grill kringla-bakeri-og-kafe l-artisan-des-glaces le-cellier-steakhouse les-halles-boulangerie-patisserie les-vins-des-chefs-de-france lotus-blossom-cafe nine-dragons-restaurant popcorn-at-canada-pavilion rose-and-crown-dining-room rose-and-crown-pub san-angel-inn-restaurante sommerfest spice-road-table sunshine-seasons tangierine-cafe teppan-edo test-track-cool-wash the-land-cart tutto-gusto-wine-cellar tutto-italia-ristorante uk-beer-cart via-napoli yorkshire-county-fish-shop
hollywood-studios: 50s-prime-time-cafe abc-commissary anaheim-produce backlot-express baseline-tap-house catalina-eddies docking-bay-7-food-and-cargo dockside-diner fairfax-fare hollywood-and-vine hollywood-brown-derby hollywood-brown-derby-lounge hollywood-scoops kat-sakas-kettle milk-stand ogas-cantina ronto-roasters rosies-all-american-cafe sci-fi-dine-in-theater trolley-car-cafe tune-in-lounge woodys-lunchbox
animal-kingdom: anandapur-ice-cream-truck caravan-road creature-comforts dawa-bar drinkwallah eight-spoon-cafe flame-tree-barbecue harambe-fruit-market harambe-market isle-of-java kusafiri-coffee-shop-and-bakery mahindi nomad-lounge pizzafari pongu-pongu quality-beverages rainforest-cafe-animal-kingdom satuli-canteen smiling-crocodile tamu-tamu-refreshments terra-treats tiffins tusker-house-restaurant warung-outpost yak-and-yeti-local-foods-cafe yak-and-yeti-restaurant
disney-springs: amorettes-patisserie bb-wolfs-sausage-co blaze-pizza boathouse-restaurant chef-art-smiths-homecomin chicken-guy coca-cola-rooftop-beverage-bar cookes-of-dublin d-luxe-burger daily-poutine dockside-margaritas earl-of-sandwich edison eet-by-maneet-chauhan enzos-hideaway erin-mckennas-bakery-nyc fork-and-screen-dine-in-theatre front-porch-bar-at-house-of-blues-restaurant frontera-cocina ghirardelli-soda-fountain haagen-dazs-west-side house-of-blues-restaurant jaleo jock-lindseys-hangar-bar joffreys-coffee-tea-company joffreys-coffee-tea-smoothie lava-lounge maria-enzo morimoto-asia morimoto-asia-street-food paddlefish paradiso-37-taste-of-the-americas pizza-ponte planet-hollywood-observatory polite-pig raglan-road-irish-pub-and-restaurant rainforest-cafe-disney-springs smokehouse splitsville starbucks-at-marketplace starbucks-west-side stargazers-bar stk-steakhouse t-rex terralina-crafted-italian the-basket vivoli-il-gelato wetzels-pretzels wetzels-pretzels-west-side wine-bar-george yesake
typhoon-lagoon: happy-landings-ice-cream leaning-palms lets-go-slurpin low-tide-lou snack-shack typhoon-tilly
blizzard-beach: arctic-expeditions avalunch blizzard-beach-mini-donuts cooling-hut frostbite-freddy i-c-expeditions lottawatta-lodge polar-pub warming-hut
all-star-movies-resort: silver-screen-spirits-pool-bar world-premiere-food-court
all-star-music-resort: intermission-food-court singing-spirits-pool-bar
all-star-sports-resort: end-zone-food-court grandstand-spirits-pool-bar
animal-kingdom-lodge: boma-flavors-of-africa cape-town-lounge-and-wine-bar jiko-the-cooking-place mara uzima-springs-pool-bar victoria-falls-lounge
animal-kingdom-villas-kidani: maji-pool-bar sanaa sanaa-lounge
art-of-animation-resort: drop-off-pool-bar landscape-of-flavors
beach-club-resort: beach-club-marketplace beaches-and-cream-soda-shop cape-may-cafe hurricane-hanna-grill
boardwalk: abracadabar blue-ribbon-corn-dog boardwalk-ice-cream boardwalk-joes-marvelous-margaritas cake-bake-shop-bakery cake-bake-shop-restaurant flying-fish funnel-cake-cart leaping-horse-libations pizza-window trattoria-al-forno
boardwalk-inn: belle-vue-lounge
cabins-at-fort-wilderness-resort: chuck-wagon-fresh-fixins-food-truck crockett-tavern meadow-snack-bar trails-end-restaurant
caribbean-beach-resort: banana-cabana-pool-bar spyglass-grill
contemporary-resort: california-grill chef-mickeys contempo-cafe contemporary-grounds cove-bar outer-rim sand-bar
coronado-springs-resort: cafe-rix laguna-bar maya-grill rix-sports-bar siestas-cantina
dolphin-hotel: bourbon-steak bourbon-steak-lounge cabana-bar-and-beach-club fountain lagoon-games-lanes-eats todd-english-bluezoo todd-english-bluezoo-lounge
four-seasons: capa ravello
grand-floridian-resort-and-spa: 1900-park-fare beach-pool-bar citricos citricos-lounge courtyard-pool-bar gasparilla-island-grill grand-floridian-cafe narcoossees
old-key-west-resort: goods-food-to-go gurgling-suitcase-libations-and-spirits olivia-cafe turtle-shack-poolside-snacks
polynesian-resort: barefoot-pool-bar capt-cooks kona-cafe kona-island oasis-bar-grill ohana pineapple-lanai tambu-lounge trader-sams-grog-grotto trader-sams-tiki-terrace
pop-century-resort: everything-pop-dining petals-pool-bar
port-orleans-resort-french-quarter: mardi-grogs sassagoula-floatworks-and-food-factory scat-cats-club
port-orleans-resort-riverside: boatwright-dining-hall muddy-rivers river-roost riverside-mill-food-court
saratoga-springs-resort-and-spa: artists-palette backstretch-pool-bar on-the-rocks paddock-grill turf-club-bar-and-grill turf-club-lounge
swan-hotel: garden-grove il-mulino-lounge il-mulino-new-york-trattoria java-bar splash-grill-and-terrace
wilderness-lodge-resort: artist-point geyser-point roaring-fork territory-lounge whispering-canyon-cafe
yacht-club-resort: ale-and-compass ale-and-compass-lounge ale-and-compass-market crew-cup-lounge marthas-vineyard yachtsman-steakhouse
`;
// Expand the compact list into [slug, parkName, areaSlug] triples.
const VENUES = VENUE_LIST.trim().split('\n').flatMap((line) => {
  const [area, slugs] = line.split(':');
  return slugs.trim().split(/\s+/).map((slug) => [slug, AREA_NAMES[area.trim()], area.trim()]);
});

const TODAY = new Date().toISOString().slice(0, 10);
const NOW = new Date().toISOString().slice(0, 16).replace('T', ' ');
const HEADER = ['Pulled', 'Restaurant', 'Park', 'Item', 'Category', 'MealPeriods', 'Description', 'Price', 'Source'];
const LOG_HEADER = ['Detected', 'Restaurant', 'Park', 'Item', 'Category', 'Old Price', 'New Price', 'Change', 'Percent', 'Source'];

function normItem(s) {
  return String(s)
    .replace(/[\u00AE\u2122\u00A9*]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\(\s*kids\s*\)\s*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const keyOf = (r) => `${normItem(r.Restaurant)}\u0000${normItem(r.Item)}`;

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCsv(rows, header) {
  return [header.join(','), ...rows.map((r) => header.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const head = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

async function readIfExists(p) {
  try { return await fs.readFile(p, 'utf8'); } catch { return null; }
}

async function getMenu(slug) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API + slug, {
        headers: {
          accept: 'application/json',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
  }
}

function collectVenue(json, park, parkSlug, slug) {
  const venueName = json?.name || slug;
  const byKey = new Map();
  for (const mp of json?.mealPeriods || []) {
    const period = mp?.label || mp?.name || '';
    for (const group of mp?.groups || []) {
      if (String(group?.type || '').toLowerCase().includes('allergy friendly')) continue;
      const category = group?.name || '';
      for (const item of group?.items || []) {
        const prices = item?.prices || [];
        if (!prices.length) continue;
        const p = prices.find((x) => typeof x?.withoutTax === 'number') || prices[0];
        if (typeof p?.withoutTax !== 'number') continue;
        const price = p.withoutTax.toFixed(2);
        const title = String(item?.title || '').trim();
        const k = [venueName, title, price, category].join('\u0000');
        if (!byKey.has(k)) {
          byKey.set(k, {
            Pulled: TODAY, Restaurant: venueName, Park: park, Item: title, Category: category,
            MealPeriods: [],
            Description: String(item?.description || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
            Price: price, Source: `${parkSlug}/${slug}`,
          });
        }
        const row = byKey.get(k);
        if (period && !row.MealPeriods.includes(period)) row.MealPeriods.push(period);
      }
    }
  }
  return [...byKey.values()].map((r) => ({ ...r, MealPeriods: r.MealPeriods.join('; ') }));
}

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
