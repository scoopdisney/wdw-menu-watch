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
  'vero-beach-resort': "Disney's Vero Beach Resort",
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
vero-beach-resort: wind-and-waves-grill
`;
