// Walt Disney World Resort menu price watch (separate from the Disneyland tracker).
// Sweeps every priced venue Disney's WDW menu API serves (parks, Disney Springs, water parks, resort hotels),
// diffs against the committed snapshot,
// appends real price moves to data/price-changes.csv, writes summary.md.

import fs from 'node:fs/promises';

const API = 'https://disneyworld.disney.go.com/dining/dinemenu/api/menu?searchTerm=';

import { AREA_NAMES, VENUE_LIST } from './venues.mjs';

// Expand the compact list into [slug, parkName, areaSlug] triples.
export const VENUES = VENUE_LIST.trim().split('\n').flatMap((line) => {
  const [area, slugs] = line.split(':');
  return slugs.trim().split(/\s+/).map((slug) => [slug, AREA_NAMES[area.trim()], area.trim()]);
});

export const TODAY = new Date().toISOString().slice(0, 10);
export const NOW = new Date().toISOString().slice(0, 16).replace('T', ' ');
export const HEADER = ['Pulled', 'Restaurant', 'Park', 'Item', 'Category', 'MealPeriods', 'Description', 'Price', 'Source'];
export const LOG_HEADER = ['Detected', 'Restaurant', 'Park', 'Item', 'Category', 'Old Price', 'New Price', 'Change', 'Percent', 'Source'];

export function normItem(s) {
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

export const keyOf = (r) => `${normItem(r.Restaurant)}\u0000${normItem(r.Item)}`;

export function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(rows, header) {
  return [header.join(','), ...rows.map((r) => header.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
}

export function parseCsv(text) {
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

export async function readIfExists(p) {
  try { return await fs.readFile(p, 'utf8'); } catch { return null; }
}

export async function getMenu(slug) {
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

export function collectVenue(json, park, parkSlug, slug) {
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
