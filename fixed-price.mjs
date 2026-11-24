// Buffet, family-style and prix fixe meals have no price field in Disney's menu
// feed. The price is written into the item title instead, for example
// "$55 per adult, plus tax and gratuity" with an empty prices list.
// This turns such a title into a row with a stable name, so that a change from
// $53 to $55 is reported as a price change and not as one item gone, one new.
const RE = /^\s*\$\s?(\d+(?:\.\d{1,2})?)\s+per\s+([a-z]+)/i;

export function fixedPrice(title, period) {
  const m = RE.exec(String(title || ''));
  if (!m) return null;
  const who = m[2][0].toUpperCase() + m[2].slice(1).toLowerCase();
  return { price: Number(m[1]).toFixed(2), item: `${period || 'Meal'} Price per ${who}` };
}
