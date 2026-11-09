# Chronicle

A timeline builder: create timelines of events, eras, factions and places, then browse them on an interactive horizontal timeline, a 3D starmap and your own flat map image. Use it for real history, a fantasy world, a sci-fi saga or anything else with a past.

## Run it

```bash
npm install
npm run dev
```

## Sample timeline

`samples/test-timeline.json` is a made-up setting that uses every feature (nested factions with themes, main factions, a named-ages calendar, eras, the 3D starmap and a flat map). Load it with **Import file…** on the home page.

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
3. ✅ Editor: forms for eras, categories, events, places
4. ✅ 3D starmap with clickable places
5. ✅ Link timeline and map, filters, search, polish
6. ✅ Setting-neutral: branding config, themes, custom calendars (years, named ages, numbered cycles, free text)
