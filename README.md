# Chronicle

A timeline builder: create timelines of events, eras, factions and places, then browse them on an interactive horizontal timeline, a 3D starmap and your own map pictures, nested as deep as you like (galaxy → region → city). Use it for real history, a fantasy world, a sci-fi saga or anything else with a past.

## Run it

```bash
npm install
npm run dev
```

## Sample timeline

`samples/test-timeline.json` is a made-up setting that uses every feature (nested factions with themes, main factions, a named-ages calendar, eras, the 3D starmap and four nested flat maps: The Shattered Realms › Brightvale, and Starmap › The Hollow Reach › Hollowhold Keep). It also covers the awkward cases: an era with more events than fit on screen (The Crown Wars, 14), an era with one event, an empty era, events outside every era, every date precision, an event with no faction, one with no place, and a very long title. Load it with **Import file…** on the timelines page.

## How data is stored

Everything is saved in your browser (IndexedDB). There are no accounts and no server. Use **Export** to save a timeline as a `.json` file for backup or sharing, and **Import file…** to load one.

## Publishing a timeline as a website

In the editor, **Website → Export website** downloads a zip: a read-only website showing that timeline in its theme. Upload the zip's contents to any static host (Netlify Drop, GitHub Pages, …); it works from any folder. Exporting needs a built copy of the app, so run `npm run serve:built` and use http://localhost:5182 (the dev server can't export).

## Building your own site on Chronicle

A site can reuse this code with its own name, look and content, without editing Chronicle's files (so pulling in Chronicle updates stays painless):

- **Branding:** set `VITE_BRAND_NAME`, `VITE_BRAND_TAGLINE`, `VITE_BRAND_MARK`, `VITE_BRAND_FOOTER`, `VITE_DEFAULT_THEME`, `VITE_SEED_URL`, `VITE_PUBLISHED`, `VITE_READ_ONLY` and `VITE_DEMO_URL` in a `.env` file. See `src/brand.ts`.
- **Published timelines:** list timeline files in `VITE_PUBLISHED`. Every visitor sees them read-only, loaded fresh on each visit, so replacing a file updates the site. Add `VITE_READ_ONLY=true` to hide creating and editing entirely.
- **Themes:** build them in the app (**Edit → Theme**): colours, fonts, node shapes and ornaments, starting from a built-in preset. Export a theme to share it; exported timelines carry their theme.

## Stack

Vite · React · TypeScript · React Router · Dexie (IndexedDB). three.js via react-three-fiber + drei for the starmap.

## Roadmap

1. ✅ Data model, storage, import/export, home screen
2. ✅ Timeline viewer: nodes, info box, arrow navigation, era bands, deep links
3. ✅ Editor: forms for eras, factions, events, places
4. ✅ 3D starmap with clickable places
5. ✅ Link timeline and map, filters, search, polish
6. ✅ Setting-neutral: branding config, themes, custom calendars (years, named ages, numbered cycles, free text)
7. ✅ Themes as data (theme editor, presets), website export, nested factions with themes, main factions, flat image map
8. ✅ One era at a time with an era glow, landing page, Calendar tab, multiple flat maps nested like factions, Maps and Starmap tabs

## To do

- [x] **Multiple flat maps.** Any number of named flat maps beside the one 3D starmap, managed in their own **Maps** tab and pinned on in the **Places** tab; a place can be pinned on several maps; the viewer and map page switch between them. Old timelines' single map became the first in the list.
- [x] **Nested maps, like nested factions.** A map can sit inside another (or inside the starmap), opened by clicking one of its places, to any depth, with breadcrumbs back up. A **start map** (master map) is where the viewer begins. Stored as a flat list with `parentId` and `placeId`, with the same loop protection as factions.
- [x] **Calendar in its own tab.** The calendar settings moved out of the Settings tab into a **Calendar** tab in the editor.
- [x] **Starmap in its own tab, coloured by the theme.** A **Starmap** tab with a live preview; the galaxy's arms and core follow the theme's accent and highlight colours (or your own).
- [ ] **Planets.** Render a 3D planet as a kind of map, like the starmap, so places can be pinned on a globe (e.g. Starmap › Sector › a planet › a city map).
  - A planet map type alongside the starmap and flat maps, nestable like any map (opened from a place on its parent map).
  - Settings for its look: a surface picture wrapped round the sphere (or a generated one), colours from the theme, atmosphere, rings, maybe clouds.
  - Places pinned by latitude and longitude, by clicking the globe; it turns to face the selected place.
