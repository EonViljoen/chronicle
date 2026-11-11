# Chronicle

A timeline builder: create timelines of events, eras, factions, characters and places, then browse them on an interactive horizontal timeline, a 3D starmap and your own map pictures, nested as deep as you like (galaxy → region → city). Use it for real history, a fantasy world, a sci-fi saga or anything else with a past.

## Run it

```bash
npm install
npm run dev
```

## Sample timeline

`samples/test-timeline.json` is a made-up setting that uses every feature (nested factions with themes, main factions, characters with feats and life dates, `[[links]]` in text, a named-ages calendar, eras, the 3D starmap and four nested flat maps: The Shattered Realms › Brightvale, and Starmap › The Hollow Reach › Hollowhold Keep). It also covers the awkward cases: an era with more events than fit on screen (The Crown Wars, 14), an era with one event, an empty era, events outside every era, every date precision, an event with no faction, one with no place, a very long title, a character with only a birth date, an independent character with no dates, and a deliberately broken `[[link]]`. Load it with **Import file…** on the timelines page.

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
9. ✅ Characters, character / place / faction pages, `[[links]]` in text

## To do

- [x] **Multiple flat maps.** Any number of named flat maps beside the one 3D starmap, managed in their own **Maps** tab and pinned on in the **Places** tab; a place can be pinned on several maps; the viewer and map page switch between them. Old timelines' single map became the first in the list.
- [x] **Nested maps, like nested factions.** A map can sit inside another (or inside the starmap), opened by clicking one of its places, to any depth, with breadcrumbs back up. A **start map** (master map) is where the viewer begins. Stored as a flat list with `parentId` and `placeId`, with the same loop protection as factions.
- [x] **Calendar in its own tab.** The calendar settings moved out of the Settings tab into a **Calendar** tab in the editor.
- [x] **Starmap in its own tab, coloured by the theme.** A **Starmap** tab with a live preview; the galaxy's arms and core follow the theme's accent and highlight colours (or your own).
- [x] **Characters.** A **Characters** tab, grouped by faction (or Independent): name, picture (uploaded or a web address), faction, birth and death dates, a description and feats. Events list the characters in them, set from either side. Each character has a page with their life on the timeline: a to-scale strip across the eras, and every event from birth to death. A **Characters** page lists everyone.
- [x] **Place and faction pages.** Every place and faction has a page with its history (every event linked to it, in order, under era headings), the people and factions involved, and its maps with the places marked. A faction's page includes its sub-factions' events and takes on its theme. Chips in the event panel open these pages.
- [x] **Links in event text.** `[[Siege of Brightvale]]` in an event's details (or a character's or place's description, or a feat) links to the event, character, place or faction with that name. `[[Name|other text]]` changes the text shown; `[[place:Name]]` picks the kind. Renaming something updates the links to it, and links that match nothing are listed under the field.
- [ ] **Planets.** Render a 3D planet as a kind of map, like the starmap, so places can be pinned on a globe (e.g. Starmap › Sector › a planet › a city map).
  - A planet map type alongside the starmap and flat maps, nestable like any map (opened from a place on its parent map).
  - Settings for its look: a surface picture wrapped round the sphere (or a generated one), colours from the theme, atmosphere, rings, maybe clouds.
  - Places pinned by latitude and longitude, by clicking the globe; it turns to face the selected place.
- [ ] **Era overview strip.** The stage shows one era at a time, so add a thin bar above it with every era, each sized by how many events it has, marking the era on show. Click an era to jump to it; it shows the whole timeline at a glance.
- [ ] **Back up everything.** Export every timeline and theme in one file, and restore from it (choosing to replace or keep copies when ids clash). A safety net while everything lives in the browser, and a way to move to another browser or computer.
- [ ] **Type check script and tests.** Add `npm run typecheck` (`tsc -p tsconfig.app.json --noEmit`; plain `tsc -p .` checks nothing, because `tsconfig.json` only lists references) and unit tests (Vitest) for the pure functions in `lib/`: dates, eras, factions, maps, mutations and above all `upgrade.ts`, since upgrades rewrite people's saved data.
- [ ] **Accounts and cloud saving (Supabase).** Optional sign-in, so your timelines and themes are saved online and follow you between devices. One service does both the sign-in and the storage.
  - **Sign-in with Supabase Auth** (email magic link or password, Google, GitHub…). Using the app without an account keeps working exactly as now, saved in the browser.
  - **Storage in Supabase** (Postgres): a `timelines` and a `themes` table keyed by `auth.uid()`, with row-level security so people only ever read and write their own. Map pictures move to Supabase Storage (a per-user folder, with its own policies) instead of living inside the timeline as `data:` URLs.
  - **Keys:** only the public anon key goes in the app (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); row-level security is what keeps data private. With no keys set, the app runs without accounts, so self-hosted and branded sites don't need Supabase.
  - **Local-first:** keep Dexie as the working copy and sync in the background, so the app stays fast and works offline. Decide how to handle edits from two devices (last save wins per timeline is the simple start).
  - **On first sign-in,** offer to upload the timelines already in this browser.
  - **Unchanged:** exported websites stay static and read-only, with no sign-in. Later, sharing a timeline with other accounts (view or edit) becomes possible.
  - Update "How data is stored" above and the privacy wording: data would no longer only live in the browser for signed-in users.
