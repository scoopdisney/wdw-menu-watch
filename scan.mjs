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
