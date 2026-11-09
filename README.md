# Chronicle

A timeline builder: create timelines of events, eras, categories and places, then browse them on an interactive horizontal timeline (and, later, a 3D starmap).

The bundled demo is an unofficial, non-commercial **Warhammer 40,000** fan timeline. Warhammer 40,000 is a trademark of Games Workshop; this project is not affiliated with or endorsed by them.

## Run it

```bash
npm install
npm run dev
```

## How data is stored

Everything is saved in your browser (IndexedDB). There are no accounts and no server. Use **Export** to save a timeline as a `.json` file for backup or sharing, and **Import file…** to load one.

## Stack

Vite · React · TypeScript · React Router · Dexie (IndexedDB). three.js via react-three-fiber + drei for the starmap.

## Roadmap

1. ✅ Data model, storage, import/export, home screen
2. ✅ Timeline viewer: nodes, info box, arrow navigation, era bands, deep links
3. ✅ Editor: forms for eras, categories, events, places
4. ✅ 3D starmap with clickable places
5. ✅ Link timeline and map, filters, search, polish
