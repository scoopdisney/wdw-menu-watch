// remainder follows VENUE_LIST
const VENUES = VENUE_LIST.trim().split('\n').flatMap((line) => {
  const [area, slugs] = line.split(':');
  return slugs.trim().split(/\s+/).map((slug) => [slug, AREA_NAMES[area.trim()], area.trim()]);
});
