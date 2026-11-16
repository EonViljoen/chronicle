# Chronicle

A timeline builder: create timelines of events, eras, factions, characters and places, then browse them on an interactive horizontal timeline, a 3D starmap and your own map pictures, nested as deep as you like (galaxy → region → city). Use it for real history, a fantasy world, a sci-fi saga or anything else with a past.

## Run it

```bash
npm install
npm run dev
```

## Sample timeline

`samples/test-timeline.json` is a made-up setting that uses every feature (nested factions with themes, main factions, characters with feats and life dates, `[[links]]` in text, a named-ages calendar, eras, the 3D starmap and four nested flat maps: The Shattered Realms › Brightvale, and Starmap › The Hollow Reach › Hollowhold Keep). It also covers the awkward cases: an era with more events than fit on screen (The Crown Wars, 14), an era with one event, an empty era, events outside every era, every date precision, events with end dates (one running into the next era, one outlasting its era), an event with no faction, one with no place, a very long title, a character with only a birth date, an independent character with no dates, and a deliberately broken `[[link]]`. Load it with **Import file…** on the timelines page.

## How data is stored

Everything is saved in your browser (IndexedDB). There are no accounts and no server. Use **Back up everything** on the timelines page to save every timeline and theme in one file (and **Restore backup…** to load it), or **Export** to save one timeline for sharing, and **Import file…** to load one.

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
10. ✅ Era overview strip, lanes per faction, events that span time
11. ✅ Tags, citations, lore pages, faction relations, character relationships and family trees, search everything

## To do

- [x] **Multiple flat maps.** Any number of named flat maps beside the one 3D starmap, managed in their own **Maps** tab and pinned on in the **Places** tab; a place can be pinned on several maps; the viewer and map page switch between them. Old timelines' single map became the first in the list.
- [x] **Nested maps, like nested factions.** A map can sit inside another (or inside the starmap), opened by clicking one of its places, to any depth, with breadcrumbs back up. A **start map** (master map) is where the viewer begins. Stored as a flat list with `parentId` and `placeId`, with the same loop protection as factions.
- [x] **Calendar in its own tab.** The calendar settings moved out of the Settings tab into a **Calendar** tab in the editor.
- [x] **Starmap in its own tab, coloured by the theme.** A **Starmap** tab with a live preview; the galaxy's arms and core follow the theme's accent and highlight colours (or your own).
- [x] **Characters.** A **Characters** tab, grouped by faction (or Independent): name, picture (uploaded or a web address), faction, birth and death dates, a description and feats. Events list the characters in them, set from either side. Each character has a page with their life on the timeline: a to-scale strip across the eras, and every event from birth to death. A **Characters** page lists everyone.
- [x] **Place and faction pages.** Every place and faction has a page with its history (every event linked to it, in order, under era headings), the people and factions involved, and its maps with the places marked. A faction's page includes its sub-factions' events and takes on its theme. Factions can have a description (with `[[links]]`) and a picture (a crest or banner), shown on their page; the picture also shows on chips, lanes and the characters list. Chips in the event panel open these pages.
- [x] **Links in event text.** `[[Siege of Brightvale]]` in an event's details (or a character's, place's or faction's description, or a feat) links to the event, character, place or faction with that name. `[[Name|other text]]` changes the text shown; `[[place:Name]]` picks the kind. Renaming something updates the links to it, and links that match nothing are listed under the field.
- [ ] **Planets.** Render a 3D planet as a kind of map, like the starmap, so places can be pinned on a globe (e.g. Starmap › Sector › a planet › a city map).
  - A planet map type alongside the starmap and flat maps, nestable like any map (opened from a place on its parent map).
  - Settings for its look: a surface picture wrapped round the sphere (or a generated one), colours from the theme, atmosphere, rings, maybe clouds.
  - Places pinned by latitude and longitude, by clicking the globe; it turns to face the selected place.
- [x] **Era overview strip.** A thin bar above the stage with every era, each as wide as its number of events (empty eras show as slivers), marking the era on show and the selected event. Click an era to jump to it. It replaced the row of era buttons.
- [x] **Lanes per faction.** **Lanes by faction** in the viewer's toolbar gives each faction its own row (a child faction gets its own, under its parent; the parent's lane holds only events of the parent itself), so parallel stories sit side by side; every event keeps its column, so what happened at the same point lines up. An event sits in its main faction's lane and also shows in full in the lane of every other faction it involves; clicking any of them picks the event, which lights up in every lane. Remembered per browser.
- [x] **Events that span time.** An event can have an end date (a war, a reign): it shows as "C.A. 140 – C.A. 350" and is drawn as a bar under the stage, reaching the last event before it ended. A span that began in an earlier era comes in from the left; one that outlasts the era runs off the right.
- [x] **Periods.** An event can be a **Period** instead of a **Moment**: a stretch of time that holds other events, like a war and its battles. It has no node; it's a bar under the track, bracketing the events it includes (picked in its **Includes**, or from each event's **Part of**). Its dates come from its first and last event unless you set its own; with no events picked it covers the events between its dates. Periods can hold periods, which stack as bars. The info box lists a period's events, and each event says which periods it's part of. At the same date, a period sorts before its events.
- [ ] **Map regions.** Named areas drawn on a map: a galaxy split into administrative segments, a kingdom's provinces, or a single feature like a storm, a nebula or a cursed wasteland.
  - **On flat maps:** draw a region as a shape (click points to make a polygon, drag them to adjust), with a name, colour, fill strength and label position. Pins stay on top.
  - **On the 3D starmap:** a region as a slice of the galaxy (from one angle to another, between two distances from the centre, like a pie segment), or a glowing cloud around a point for a single feature; both in the region's colour, with its name floating over it.
  - **Linked to the rest:** a region can belong to a faction (taking its colour), have a description with `[[links]]`, and list the places inside it, worked out from their pins. Clicking a region shows its places and events; regions get their own page like places do.
  - **Over time (later):** an optional start and end date, so a region can appear, change hands or vanish as you move through eras. This builds towards "Faction territory over time" in the ideas below.
  - **Viewer:** a toggle to show or hide regions, so they don't crowd busy maps.
- [x] **Faction relations.** A **Relations** tab in the editor records how factions stand with each other: allies, at war, rivals, trade, truce, or one serving another (one way). Each can have a start and end date and a note with `[[links]]`. The **Faction relations** page (`/t/:id/relations`) draws them as a diagram (factions with their pictures and colours, lines styled by kind) for all time or one era, with the list underneath; each faction's page lists its relations. Deleting a faction removes its relations.
- [x] **Back up everything.** **Back up everything** on the timelines page downloads one JSON file with every timeline and theme in this browser; **Restore backup…** (or picking the file in **Import file…**) shows what's in it and asks what to do with timelines and themes already here: keep both, or replace them. The page reminds you when you last backed up. The file is versioned (`"kind": "chronicle-backup"`), ready to be uploaded to an account once accounts exist.
- [x] **Sources and citations.** `[^1]` in an event's details (or a lore page) cites its first source, `[^2]` the second; they show as small raised numbers that jump to the source and make it flash. Sources are numbered, can be Markdown links, and the form warns about a citation with no source.
- [x] **Lore pages.** Free-form pages that aren't an event, character, place or faction (a religion, a language, an artefact): a title, a category, a picture, text with `[[links]]` and citations, and sources. A **Lore** tab in the editor, a **Lore** page listing them by category, and `[[lore:Name]]` links. Each page shows the events that mention it; character, place, faction and lore pages all list what links to them (**Mentioned in**).
- [x] **Shrink uploaded pictures.** Uploads are resized (maps to 4096 pixels across, portraits and crests to 640) and saved as WebP, keeping whichever is smaller; SVGs and GIFs stay as they are. **Settings → Pictures** shows how much room a timeline's pictures take and shrinks ones added before this.
- [ ] **Undo / redo in the editor.** Keep the last few versions of the timeline in memory, so Ctrl+Z (and an Undo button) brings back a wrong edit or delete, and Ctrl+Shift+Z redoes it. Cleared when you leave the editor; backups cover the rest.
- [x] **Search everything.** **Search** in the header (or Ctrl+K / ⌘K) opens a quick finder across events (title, text, date, `#tags`), characters, places, factions and lore pages. ↑ ↓ and Enter open the event on the timeline or the item's page; in the editor, the item's form.
- [x] **Character relationships and family trees.** A **Relationships** list on the character form (parent / child, spouse, sibling, mentor / student, friend, rival, enemy), saved both ways. Each character's page groups them (Parents, Children, Rivals…) and draws a family tree from the parent and spouse links, a generation per row. The **Characters** page has a relationships diagram, sharing the diagram code with faction relations.
- [ ] **Play mode.** Step through the timeline on its own, event by event and era by era, with the era glow and faction themes changing as it goes; pause, speed and a start point. For presenting a world.
- [ ] **To-scale view.** An optional stage that spaces events by their real dates instead of evenly, so long gaps and busy periods show (like the character page's life strip), with zoom.
- [ ] **Spreadsheet import (CSV).** Paste or upload rows (date, title, summary, faction, place…), match the columns, preview, and add them as events, creating missing factions and places.
- [ ] **Print / PDF export.** A clean printable chronicle: eras as chapters, events in order, then character, faction and place pages, in the timeline's theme.
- [x] **Tags on events.** Free labels ("battle", "treaty") separate from factions, typed in the event form with suggestions from tags already used. They show as `# chips` in the info box (click one to filter by it), can be picked in the viewer's **Filter by tag…**, and match in search.
- [ ] **Type check script and tests.** Add `npm run typecheck` (`tsc -p tsconfig.app.json --noEmit`; plain `tsc -p .` checks nothing, because `tsconfig.json` only lists references) and unit tests (Vitest) for the pure functions in `lib/`: dates, eras, factions, maps, mutations and above all `upgrade.ts`, since upgrades rewrite people's saved data.
- [ ] **Accounts and cloud saving (Supabase).** Optional sign-in, so your timelines and themes are saved online and follow you between devices. One service does both the sign-in and the storage.
  - **Sign-in with Supabase Auth** (email magic link or password, Google, GitHub…). Using the app without an account keeps working exactly as now, saved in the browser.
  - **Storage in Supabase** (Postgres): a `timelines` and a `themes` table keyed by `auth.uid()`, with row-level security so people only ever read and write their own. Map pictures move to Supabase Storage (a per-user folder, with its own policies) instead of living inside the timeline as `data:` URLs.
  - **Keys:** only the public anon key goes in the app (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); row-level security is what keeps data private. With no keys set, the app runs without accounts, so self-hosted and branded sites don't need Supabase.
  - **Local-first:** keep Dexie as the working copy and sync in the background, so the app stays fast and works offline. Decide how to handle edits from two devices (last save wins per timeline is the simple start).
  - **On first sign-in,** offer to upload the timelines already in this browser.
  - **Unchanged:** exported websites stay static and read-only, with no sign-in. Later, sharing a timeline with other accounts (view or edit) becomes possible.
  - Update "How data is stored" above and the privacy wording: data would no longer only live in the browser for signed-in users.

## Ideas

Not planned yet: possibilities to pick from. When one is chosen, it moves up to the to-do list.

**Writing and worldbuilding**
- **Uncertain or disputed events.** Mark an event as legend, disputed or one side's account, with a different node style.
- **Alternate versions.** Two accounts of the same event ("The Crown's telling" / "The Concord's telling"), switchable in the event panel.

**Viewing and exploring**
- **"Meanwhile" on the event panel.** What else was happening at about the same time in other factions and places, and which characters were alive.
- **Statistics page.** Events per era and faction, busiest places, longest-lived characters, gaps with nothing recorded.
- **Map playback.** A time slider on the map page showing which places were active in each era.
- **Faction territory over time.** Colour areas of a flat map by who held them, changing as you move through eras.

**Editing comfort**
- **Duplicate an event.** For series of similar events.
- **Bulk edit.** Select several events in the list and change their era, faction or tags at once.
- **Edit from the viewer.** Edit an event's title, date or summary in the info box without switching to the editor.
- **Draft events.** Hidden from the viewer and exported websites until marked ready.

**Sharing**
- **Share a single event or character.** A link with a social preview (title, date, picture) for exported websites.
- **Embeddable timeline.** A small read-only stage for other sites, through an `<iframe>`.
- **Viewer language.** Translatable interface text, so exported websites can be in another language (your content stays as written).

**Quality**
- **Accessibility pass.** Screen-reader labels for the stage, keyboard reach for maps and diagrams, and contrast checks for custom themes in the theme editor.
- **Performance with big timelines.** Test with 2,000+ events; only render what's visible on long eras.
- **Offline install (PWA).** Install Chronicle as an app that works with no connection.
