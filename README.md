# Chronicle

A timeline builder: create timelines of events, eras, categories and places, then browse them on an interactive horizontal timeline and a 3D starmap. Use it for real history, a fantasy world, a sci-fi saga or anything else with a past.

## Run it

```bash
npm install
npm run dev
```

## How data is stored

Everything is saved in your browser (IndexedDB). There are no accounts and no server. Use **Export** to save a timeline as a `.json` file for backup or sharing, and **Import file…** to load one.

## Building your own site on Chronicle

A site can reuse this code with its own name, look and content, without editing Chronicle's files (so pulling in Chronicle updates stays painless):

- **Branding:** set `VITE_BRAND_NAME`, `VITE_BRAND_TAGLINE`, `VITE_BRAND_MARK`, `VITE_BRAND_FOOTER`, `VITE_DEFAULT_THEME`, `VITE_SEED_URL` and `VITE_DEMO_URL` in a `.env` file. See `src/brand.ts`.
- **Themes:** add a folder under `src/themes/` with an `index.ts` and a stylesheet. It's picked up automatically. See `src/themes/README.md`.

## Stack

Vite · React · TypeScript · React Router · Dexie (IndexedDB). three.js via react-three-fiber + drei for the starmap.

## Roadmap

1. ✅ Data model, storage, import/export, home screen
2. ✅ Timeline viewer: nodes, info box, arrow navigation, era bands, deep links
3. ✅ Editor: forms for eras, categories, events, places
4. ✅ 3D starmap with clickable places
5. ✅ Link timeline and map, filters, search, polish
6. ✅ Setting-neutral: branding config, themes, custom calendars (years, named ages, numbered cycles, free text)
