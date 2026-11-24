// Temporary diagnostic (probe branch only). Prints Disney's dining directory.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const today = new Date().toISOString().slice(0, 10);
const url = `https://disneyworld.disney.go.com/finder/api/v1/explorer-service/list-ancestor-entities/wdw/80007798;entityType=destination/${today}/dining`;
const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', 'accept-language': 'en-US,en;q=0.9' } });
const json = await res.json();
console.log('TOPKEYS', Object.keys(json).join(','));
for (const r of json.results || []) console.log(`F|${r.entityType}|${r.urlFriendlyId}|${r.url}|${r.name}|${r.locationName}`);
