// Compares the venue table against Disney's own dining directory, so a
// restaurant that is missing from venues.mjs shows up in the daily summary
// instead of going unwatched.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const LIST = 'https://disneyworld.disney.go.com/finder/api/v1/explorer-service/list-ancestor-entities/wdw/80007798;entityType=destination/';

export async function untrackedVenues(trackedSlugs, ignoredSlugs, date) {
  const res = await fetch(`${LIST}${date}/dining`, {
    headers: { accept: 'application/json', 'accept-language': 'en-US,en;q=0.9', 'user-agent': UA },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = JSON.parse(await res.text());
  const out = new Map();
  for (const r of json?.results || []) {
    const slug = r?.urlFriendlyId;
    const path = String(r?.url || '');
    if (r?.entityType !== 'restaurant' || !slug || !path.startsWith('/dining/')) continue;
    if (trackedSlugs.has(slug) || ignoredSlugs.has(slug)) continue;
    out.set(slug, `${String(r?.name || slug).trim()} (${path.replace(/^\/dining\//, '').replace(/\/$/, '')})`);
  }
  return [...out.values()].sort();
}
