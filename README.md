# wdw-menu-watch

Walt Disney World Resort menu price watch for TheDisneyScoop.com. **Separate from `disney-menu-watch` (Disneyland Resort).** Same rules, same file layout, different destination.

- Source: `https://disneyworld.disney.go.com/dining/dinemenu/api/menu?searchTerm=<slug>` (no auth; browser User-Agent + `Accept-Language` required)
- 374 priced venues: Magic Kingdom, EPCOT, Hollywood Studios, Animal Kingdom, Disney Springs, Typhoon Lagoon, Blizzard Beach and every Disney resort hotel (plus Swan/Dolphin and Four Seasons). ~22,000 priced rows per sweep.
- `data/current.csv` — full snapshot (Pulled, Restaurant, Park, Item, Category, MealPeriods, Description, Price, Source)
- `data/magic-kingdom.csv`, `epcot.csv`, `hollywood-studios.csv`, `animal-kingdom.csv`, `disney-springs.csv`, `water-parks.csv`, `resorts.csv` — the same rows split by area
- `data/price-changes.csv` — append-only log of real price moves
- `data/last-daily.txt` — date the daily summary last posted (guarantees one summary per day regardless of scheduler drift)
- Diff rules: key = Restaurant + normalized Item (strip ®™©* before NFKD, strip diacritics, drop "(Kids)", lowercase); adult/kids duplicates are flagged, never counted as changes; new items are logged separately, not as price moves; renames alongside a reprice are invisible.
- Fixed-price meals: buffets, family-style and prix fixe restaurants list the price as text in the item title ("$55 per adult, plus tax and gratuity") with no price field. `fixed-price.mjs` turns each into a row named like `Breakfast Price per Adult`, so an increase shows up as a price change.
- Directory check: once a day `directory.mjs` compares `venues.mjs` with Disney's dining directory and lists any restaurant that is not tracked in the daily summary. Slugs with no prices go in `DIRECTORY_IGNORE` in `venues.mjs`.
- Abort guard: >15 venue failures or <12,000 rows leaves the snapshot untouched.

Run locally: `node scan.mjs`. Vercel download page: `node build.mjs` (outputDirectory `public`).
