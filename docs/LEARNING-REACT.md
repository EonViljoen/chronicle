# Learning React with Chronicle

This guide teaches React using Chronicle, the timeline builder, as the worked example. Every idea is shown with real code from this project, with a link to the file, so you can open it, change it, and see what happens.

It assumes you can read JavaScript or TypeScript and have used a web app before. It doesn't assume you know React.

> **Versions.** Chronicle uses **React 19.3**, **React Router 7.18**, **Vite 6.4**, **TypeScript 5.8**, **Dexie 4.0** (the browser database), **react-three-fiber 9.1** with **drei 10.0** and **three.js 0.176**. A few things here are React 19 specific (passing `ref` as a normal prop, for one). Older tutorials may show `forwardRef` for that; you don't need it any more.

> **Compared with Polyphemus.** Polyphemus is a Next.js app: some code runs on a server, some in the browser. Chronicle has **no server at all**. Every line runs in the browser, and the data lives in the browser too. That makes it a cleaner place to learn plain React: no Server Components, no Server Actions, no "which side does this run on?". If you've read the Polyphemus guide, Part 2 here will feel familiar, and Part 3 replaces the Next.js chapters with the libraries this app uses instead.

### How to use this guide

- Read Part 1 first for the map of the territory.
- Part 2 is the core of React. Each section points at real code; open it side by side.
- Part 3 explains the libraries around React.
- Part 4 follows four user actions all the way through the code. Come back to these after Part 2; they tie everything together.
- Part 5 has exercises. Doing them is how it sticks.

Keep the app running while you read:

```bash
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`). Vite reloads the page as you save files, so you can experiment freely. `git checkout .` puts everything back.

---

## Contents

**Part 1: The big picture**
1. [What React is, and what the other libraries add](#1-what-react-is-and-what-the-other-libraries-add)
2. [What happens when you open the app](#2-what-happens-when-you-open-the-app)
3. [A tour of the project folders](#3-a-tour-of-the-project-folders)
4. [The TypeScript you'll see](#4-the-typescript-youll-see)

**Part 2: React**
5. [Components and JSX](#5-components-and-jsx)
6. [Props](#6-props)
7. [State and re-rendering](#7-state-and-re-rendering)
8. [Events and forms](#8-events-and-forms)
9. [Lists and keys](#9-lists-and-keys)
10. [Effects](#10-effects)
11. [Refs](#11-refs)
12. [Memoising: `useMemo` and `useCallback`](#12-memoising-usememo-and-usecallback)
13. [Custom hooks and the rules of hooks](#13-custom-hooks-and-the-rules-of-hooks)
14. [Reusable components: generics, render props and children](#14-reusable-components-generics-render-props-and-children)
15. [Lazy loading and Suspense](#15-lazy-loading-and-suspense)
16. [Where every piece of state lives](#16-where-every-piece-of-state-lives)

**Part 3: The libraries around React**
17. [React Router: pages and the URL](#17-react-router-pages-and-the-url)
18. [Dexie: the database in the browser](#18-dexie-the-database-in-the-browser)
19. [Pure update functions and immutability](#19-pure-update-functions-and-immutability)
20. [The data model: dates, eras and filters](#20-the-data-model-dates-eras-and-filters)
21. [react-three-fiber: 3D as components](#21-react-three-fiber-3d-as-components)
22. [Styling: CSS tokens and CSS variables from React](#22-styling-css-tokens-and-css-variables-from-react)
23. [Tooling: Vite, TypeScript and ESLint](#23-tooling-vite-typescript-and-eslint)

**Part 4: Putting it together**
24. [Walkthrough A: importing a timeline file](#24-walkthrough-a-importing-a-timeline-file)
25. [Walkthrough B: pressing → on the timeline](#25-walkthrough-b-pressing--on-the-timeline)
26. [Walkthrough C: editing and saving an event](#26-walkthrough-c-editing-and-saving-an-event)
27. [Walkthrough D: clicking a place on the map](#27-walkthrough-d-clicking-a-place-on-the-map)

**Part 5: Practice**
28. [Exercises](#28-exercises)
29. [Common mistakes and how to spot them](#29-common-mistakes-and-how-to-spot-them)
30. [Glossary](#30-glossary)
31. [Where to read more](#31-where-to-read-more)

---

# Part 1: The big picture

## 1. What React is, and what the other libraries add

### React: describe the screen, React draws it

Without React, you change a page by hand: find an element, set its text, add a class, remove a child. With a big page that gets out of sync quickly.

React flips this around. You write **functions that return a description of the screen** for the current data. When the data changes, React calls your functions again, compares the new description with the old one, and changes only the parts of the real page that differ.

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
```

You never write "update the button text". You change `count`, and the screen follows. That one idea is most of React; the rest of this guide is detail around it.

These functions are called **components**. A page is a tree of them: `App` contains `Layout`, which contains `ViewerPage`, which contains `TimelineViewer`, which contains `TimelineTrack`, which contains one `TimelineNode` per event.

### The other libraries

React only handles "data → screen". Everything else comes from libraries:

| Library | What it does here | Guide section |
|---|---|---|
| **Vite** | Dev server and build tool. Turns TypeScript/JSX into browser JavaScript, reloads on save. | [23](#23-tooling-vite-typescript-and-eslint) |
| **React Router** | Maps URLs (`/t/abc/edit`) to page components; reads and writes the `?event=` part. | [17](#17-react-router-pages-and-the-url) |
| **Dexie** | A friendly wrapper around IndexedDB, the database built into every browser. All timelines live here. | [18](#18-dexie-the-database-in-the-browser) |
| **react-markdown** | Turns the Markdown in an event's details into HTML elements. | [5](#5-components-and-jsx) |
| **three.js** | 3D graphics in the browser (WebGL). | [21](#21-react-three-fiber-3d-as-components) |
| **react-three-fiber** (r3f) | Lets you write three.js scenes as React components. | [21](#21-react-three-fiber-3d-as-components) |
| **drei** | Ready-made r3f helpers: camera controls, HTML labels, a starfield. | [21](#21-react-three-fiber-3d-as-components) |

### Where code runs

Everywhere is the browser. When you run `npm run build`, Vite produces plain HTML, CSS and JavaScript files in `dist/`. Any static web host can serve them. There's no backend, no API and no login: each visitor's timelines are stored in their own browser.

## 2. What happens when you open the app

Follow it from the first byte:

1. **The browser loads [`index.html`](../index.html).** It's nearly empty: a `<div id="root"></div>` and a `<script type="module" src="/src/main.tsx">`.

2. **[`main.tsx`](../src/main.tsx) starts React:**

   ```tsx
   createRoot(document.getElementById('root')!).render(
     <StrictMode>
       <App />
     </StrictMode>,
   )
   ```

   `createRoot` hands the `#root` div to React. From now on React owns everything inside it. `StrictMode` is a development helper (see [section 10](#strictmode-runs-effects-twice-in-development)); it does nothing in the production build.

3. **[`App.tsx`](../src/App.tsx) sets up the routes:**

   ```tsx
   const router = createBrowserRouter([
     {
       element: <Layout />,
       children: [
         { path: '/', element: <HomePage /> },
         { path: '/t/:id', element: <ViewerPage /> },
         { path: '/t/:id/edit', element: <EditorPage /> },
         { path: '/t/:id/map', element: <MapPage /> },
       ],
     },
   ]);
   ```

   React Router looks at the address bar, finds the matching route, and renders `Layout` with the matching page inside it.

4. **[`Layout`](../src/components/Layout.tsx) draws the header** and an `<Outlet />`, the slot where the page goes.

5. **The page asks Dexie for data.** [`HomePage`](../src/pages/HomePage.tsx) calls `useTimelines()`. The first render happens *before* the database answers, so `timelines` is `undefined` and the page shows "Loading…". A moment later the data arrives, React calls `HomePage` again, and the cards appear.

6. **You click something.** An event handler runs, changes some state (or the database, or the URL), React re-renders the affected components, and the screen updates. Part 4 follows four of these clicks in detail.

That's the whole lifecycle: **render from data → user does something → data changes → render again.**

## 3. A tour of the project folders

```
wh40k-timeline/
├── index.html                  The one HTML page; loads main.tsx
├── vite.config.ts              Vite settings (just the React plugin)
├── tsconfig*.json              TypeScript settings
├── eslint.config.js            Lint rules, including the Rules of Hooks
└── src/
    ├── main.tsx                Starts React
    ├── App.tsx                 The routes
    ├── brand.ts                The app's name, default theme, demo link (from .env)
    ├── index.css               All the styles
    ├── types/timeline.ts       The data model: Timeline, Era, TimelineEvent…
    ├── db/
    │   ├── db.ts               The Dexie database definition
    │   └── timelines.ts        Read hooks and write functions for timelines
    ├── lib/                    Plain functions, no React (easy to test)
    │   ├── characters.ts       Characters grouped by faction; their events; ages
    │   ├── dates.ts            Calendars: turning a date number into "AD 1066" and back
    │   ├── eras.ts             Which era a date is in; era bands
    │   ├── filters.ts          Does an event match the search/filters?
    │   ├── ids.ts              "Horus Heresy" -> "horus-heresy"
    │   ├── images.ts           Reading an uploaded picture (maps, portraits)
    │   ├── links.ts            [[Links]] in text: finding what they point at, renaming
    │   ├── maps.ts             The starmap and flat maps as one list; the map tree
    │   ├── mutations.ts        Timeline -> new Timeline update functions
    │   ├── prefs.ts            Preferences in localStorage (usePref)
    │   ├── upgrade.ts          Upgrading timelines saved by older versions
    │   └── validate.ts         Checking imported JSON files
    ├── themes/                 Theme presets, fonts, and applying a theme to the page
    ├── pages/                  One component per route
    │   ├── HomePage.tsx        / : the landing page
    │   ├── TimelinesPage.tsx   /timelines : your timelines, with a dashboard
    │   ├── ViewerPage.tsx      /t/:id
    │   ├── EditorPage.tsx      /t/:id/edit
    │   ├── MapPage.tsx         /t/:id/map
    │   ├── CharactersPage.tsx  /t/:id/characters : everyone, by faction
    │   ├── CharacterPage.tsx   /t/:id/characters/:itemId : a life on the timeline
    │   ├── PlacePage.tsx       /t/:id/places/:itemId : a place's history
    │   └── FactionPage.tsx     /t/:id/factions/:itemId : a faction's history
    └── components/
        ├── Layout.tsx          Header + <Outlet />
        ├── TimelineCard.tsx    One card on the home page
        ├── TimelineGate.tsx    Loads the timeline in the URL, handles "not found"
        ├── RichText.tsx        Markdown with [[links]] turned into router links
        ├── history/            The pieces of the character, place and faction pages
        ├── viewer/             The horizontal timeline and info box
        ├── editor/             The editor's tabs and forms
        ├── form/               Reusable inputs (NumberInput, DateInput, Field…)
        └── map/                The 3D galaxy
```

A useful habit this layout follows: **`lib/` has no React in it.** Functions like `matchesFilters` or `saveEvent` take data and return data. Components call them. That keeps the tricky logic easy to read and test on its own.

## 4. The TypeScript you'll see

React and TypeScript are separate things, but this project uses TypeScript everywhere, so here's the subset you need. All examples are from [`types/timeline.ts`](../src/types/timeline.ts) unless noted.

**Interfaces describe object shapes:**

```ts
export interface Era {
  id: string;
  name: string;
  color: string;
  start: number;
  end: number;
}
```

**Union types allow a fixed set of values:**

```ts
export type DatePrecision = 'exact' | 'circa' | 'decade' | 'century' | 'millennium' | 'period';
```

A `DatePrecision` can only be one of those strings. Typo `'centruy'` and TypeScript refuses to compile.

**Optional fields** have a `?`: `imageUrl?: string` may be missing.

**Discriminated unions** are a union of object shapes with a shared "tag" field:

```ts
export type MapConfig =
  | { type: 'none' }
  | { type: 'galaxy3d'; arms: number; radius: number; colors?: 'theme' | 'custom'; coreColor: string; armColor: string };
```

You can't read `map.arms` until you've checked `map.type === 'galaxy3d'`. After the check, TypeScript *narrows* the type and lets you. [`StarmapTab.tsx`](../src/components/editor/StarmapTab.tsx) relies on this:

```tsx
{map.type === 'galaxy3d' && (
  <NumberInput value={map.arms} … />   // allowed: we're inside the check
)}
```

**Utility types** build new types from old ones:

| Type | Meaning | Used in |
|---|---|---|
| `Partial<T>` | All fields optional | `patch(changes: Partial<T>)` in `useDraft` |
| `Pick<T, 'a' \| 'b'>` | Only those fields | `Settings` in `SettingsForm` |
| `Extract<U, X>` | The members of a union that match `X` | `GalaxyConfig` |
| `Record<K, V>` | An object with keys `K`, values `V` | `PRECISION_LABELS` in `DateInputs` |
| `Omit<T, 'a'>` | All fields except those | `NumberInput`'s props |

**Generics** are type parameters, like function parameters but for types. `upsert<T extends { id: string }>(list: T[], item: T): T[]` in [`mutations.ts`](../src/lib/mutations.ts) works for eras, factions, places and events: anything with an `id`. See [section 14](#14-reusable-components-generics-render-props-and-children) for a generic component.

**Type-only imports.** `import type { Era } from '…'` imports a type, which disappears from the compiled JavaScript. The project's settings (`verbatimModuleSyntax`) insist you mark these.

**Type guards** tell TypeScript what a check proves:

```ts
.filter((e): e is TimelineEvent => e !== undefined)
```

Without the `e is TimelineEvent` part, TypeScript would still think the array might contain `undefined`. ([`EventPanel.tsx`](../src/components/viewer/EventPanel.tsx))

**Assertion functions** do the same for a whole function. In [`validate.ts`](../src/lib/validate.ts), `assertTimelineShape(data: unknown): asserts data is { schemaVersion: number }` throws if the data is wrong; after calling it, TypeScript knows `data` has a `schemaVersion`.

**`as` casts** override TypeScript: `{ '--i': index } as CSSProperties`. Use them sparingly; you're telling the compiler "trust me".

**`as const`** keeps literal types: `const TABS = ['events', 'eras', …] as const` makes the type `'events' | 'eras' | …` rather than `string[]`. [`EditorPage.tsx`](../src/pages/EditorPage.tsx) then derives `type Tab = (typeof TABS)[number]`.

---

# Part 2: React

## 5. Components and JSX

A **component** is a function whose name starts with a capital letter and that returns JSX. Here's the smallest one in the project, [`Layout.tsx`](../src/components/Layout.tsx):

```tsx
export default function Layout() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">◆</span> Chronicle
        </Link>
        <span className="brand-sub">timeline builder</span>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
```

### JSX is JavaScript

JSX looks like HTML but compiles to function calls. `<span className="brand-sub">x</span>` becomes roughly `jsx('span', { className: 'brand-sub', children: 'x' })`. That explains its rules:

- **`className`, not `class`**, because `class` is a JavaScript keyword. Likewise `htmlFor`, not `for`.
- **One root element.** A function returns one value. Wrap siblings in a `<div>` or a **fragment** `<>…</>`, which adds nothing to the page. `TimelineGate` returns `<>{children(timeline)}</>`.
- **Curly braces switch back to JavaScript.** `{timeline.title}`, `{events.length} events`, `style={{ background: era.color }}` (the outer braces mean "JavaScript", the inner ones are an object).
- **Capitalised tags are components, lowercase tags are HTML.** `<Link>` calls the `Link` function; `<span>` makes a span.
- **Every tag must close.** `<input />`, `<br />`.

### Showing things conditionally

There's no `if` inside JSX, so you use expressions. All three forms appear in [`EventPanel.tsx`](../src/components/viewer/EventPanel.tsx):

```tsx
{era && <span className="muted"> · {era.name}</span>}            // show if truthy

{event.body ? <Markdown>{event.body}</Markdown>                   // either/or
            : <p className="muted">{event.summary || 'No details yet.'}</p>}

{related.length > 0 && ( <section>…</section> )}                 // careful with numbers!
```

Watch the last one: `{related.length && …}` would render a literal **0** on the page when the list is empty, because `0` is falsy but React still draws numbers. Compare with `> 0` to get a real boolean.

For bigger branches, use a normal `if` *before* the `return`. [`TimelineGate.tsx`](../src/components/TimelineGate.tsx):

```tsx
if (timeline === undefined) return <p className="muted">Loading…</p>;
if (timeline === null) {
  return ( <div className="empty">…That timeline doesn't exist…</div> );
}
return <>{children(timeline)}</>;
```

Or keep a piece of JSX in a variable. `TimelineViewer` builds `const panel = selected ? <EventPanel … /> : <p>…</p>;` once, then places `{panel}` in either layout.

### Components from libraries are just components

`<Markdown>{event.body}</Markdown>` from react-markdown takes a Markdown string as its child and returns the matching `<p>`, `<strong>`, `<ul>` elements. You use it exactly like your own components.

### Components must be pure

React may call your component function at any time, more than once, and expects the same output for the same inputs. So **during render, don't change anything outside the function**: no writing to the database, no `document.title = …`, no changing variables declared outside. Calculating things is fine. Changing things belongs in event handlers (section 8) or effects (section 10).

## 6. Props

**Props** are a component's inputs, passed like HTML attributes. [`TimelineNode.tsx`](../src/components/viewer/TimelineNode.tsx) declares what it needs:

```tsx
interface Props {
  event: TimelineEvent;
  index: number;
  color: string;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
  ref: Ref<HTMLButtonElement>;
}

export default function TimelineNode({ event, index, color, selected, dimmed, onSelect, ref }: Props) {
```

The `{ event, index, … }` in the parameter list is **destructuring**: pulling fields out of the single `props` object. [`TimelineTrack.tsx`](../src/components/viewer/TimelineTrack.tsx) provides them:

```tsx
<TimelineNode
  key={event.id}
  event={event}
  index={i}
  color={colorById.get(event.factionIds[0]) ?? FALLBACK_COLOR}
  selected={event.id === selectedId}
  dimmed={!isVisible(event)}
  onSelect={onSelect}
/>
```

Props are **read-only**. A component never changes its own props; if something needs to change, the parent changes the data and passes new props.

### Data flows down, events flow up

`TimelineNode` doesn't know what selecting means. It's handed `selected` (data, flowing down) and `onSelect` (a function, so it can report a click back up):

```tsx
<button onClick={() => onSelect(event.id)} aria-pressed={selected}>
```

Follow `onSelect` upwards: `TimelineNode` ← `TimelineTrack` ← `TimelineViewer`, where it's `select = setSelectedId`. The state lives in the component that needs it shared (the viewer: the track, the info box *and* the map all depend on it), and children get it through props. This is called **lifting state up**, and it's the main way React components talk to each other.

The naming convention: props that are callbacks start with `on` (`onSelect`, `onChange`, `onDirtyChange`), and the functions that implement them often start with `handle` (`handleSave`, `handleDelete` in `CollectionTab`).

### `children`

Whatever you put between a component's tags arrives as the `children` prop. [`Field.tsx`](../src/components/form/Field.tsx) wraps any input in a label:

```tsx
<Field label="Name" error={…}>
  <input value={draft.name} … />      ← this is `children`
</Field>
```

```tsx
export default function Field({ label, hint, error, group, children }: Props) {
  …
  return (
    <Wrapper className="field">
      <Title className="field-label">{label}</Title>
      {children}
      …
    </Wrapper>
  );
}
```

`children` can also be a **function**. That's the "render prop" pattern, used by `TimelineGate` (section 14).

### `ref` is a normal prop in React 19

`TimelineNode` lists `ref` in its props and puts it on its `<button>`. In React 18 and earlier you needed a wrapper called `forwardRef` for this; in React 19 it's just a prop. Section 11 explains what the parent does with it.

## 7. State and re-rendering

**State** is data a component remembers between renders, and that triggers a re-render when it changes. [`HomePage.tsx`](../src/pages/HomePage.tsx):

```tsx
const [newTitle, setNewTitle] = useState('');
const [error, setError] = useState<string | null>(null);
const [busy, setBusy] = useState(false);
```

How it works:

1. `useState(initial)` returns a pair: the current value and a setter.
2. On the first render, the value is `initial`.
3. Calling `setBusy(true)` doesn't change `busy` in place. It tells React "this component's state changed", and React **calls `HomePage` again**. This time `useState` returns `true`.
4. Everything in the function runs again with the new value, and React updates the page to match the new JSX.

### Each render is a snapshot

Inside one render, state is a constant. After `setBusy(true)`, the `busy` variable in the code that's currently running is still `false`; the new value appears on the next call of the component. The `run` helper in `HomePage` relies on this being fine: it sets `busy`, awaits the work, and sets it back. It never reads `busy` in between.

### Replace, don't mutate

React decides whether something changed by comparing **references**: is this the same object as last time? So for objects and arrays, always build a new one. From [`ViewerToolbar.tsx`](../src/components/viewer/ViewerToolbar.tsx):

```tsx
const addFaction = (id: string) => id && set({ factionIds: [...filters.factionIds, id] });
const removeFaction = (id: string) => set({ factionIds: filters.factionIds.filter((c) => c !== id) });
```

`[...ids, id]` and `filter` both return *new* arrays. If you wrote `ids.push(id)` instead, the array would be the same object, React would see "no change", and nothing would update. Section 19 applies the same rule to whole timelines.

### Functional updates: when the next value depends on the last

This is the most important subtle point in the project, and it was a real bug. The first version of the viewer stepped to the next event like this:

```tsx
const target = neighbour(direction);   // uses `selected` from this render
if (target) select(target.id);
```

Pressing → five times quickly only moved a few events. Each key press ran code from the *last render's snapshot*, so several presses all computed "the event after the same one". The fix in [`TimelineViewer.tsx`](../src/components/viewer/TimelineViewer.tsx):

```tsx
const step = useCallback(
  (direction: 1 | -1) => setSelectedId((prev) => neighbourOf(prev, direction)?.id ?? prev),
  [neighbourOf],
);
```

Passing a **function** to the setter (`setSelectedId(prev => …)`) means "compute the new value from the latest one". React queues these and runs them in order, each getting the result of the one before. **Rule of thumb: if the new state is calculated from the old state, use the function form.** `setFilters((f) => ({ ...f, placeId }))` in the viewer's `focusPlace` and `setDraft((d) => ({ ...d, ...changes }))` in `useDraft` follow the same rule.

### Lazy initial state

`useState(expensive())` would call `expensive()` on every render and throw the result away after the first. Pass the function itself and React calls it once:

```tsx
// TimelineViewer: read the URL only on the first render
const [selectedId, setSelectedId] = useState<string | null>(() => params.get('event'));

// CollectionTab: build the blank item once
const [blankItem] = useState(blank);

// usePref: read localStorage once
const [value, setValue] = useState<T>(() => readPref(key, fallback));
```

### Derived data: don't store what you can calculate

If a value can be computed from props or state, compute it during render. Don't keep a copy in state, because copies drift out of sync. The viewer is full of derived values:

```tsx
const selected = events.find((e) => e.id === selectedId) ?? null;
const visible = useMemo(() => events.filter(isVisible), [events, isVisible]);
const position = selected ? visible.indexOf(selected) : -1;
const status = position !== -1 ? `${position + 1} / ${visible.length}` : `${visible.length} events`;
```

Only `selectedId` and `filters` are state. Everything else follows from them. When you're tempted to add `useState`, ask: "could I calculate this from what I already have?"

### Resetting state with a `key`

Sometimes you want a component to forget its state and start fresh. Instead of resetting each `useState` by hand, change its `key` and React throws the old instance away and builds a new one. [`CollectionTab.tsx`](../src/components/editor/CollectionTab.tsx):

```tsx
<Fragment key={itemId}>
  {renderForm({ original: selected, … })}
</Fragment>
```

Each form keeps a draft in state (section 13). When you pick a different era, `itemId` changes, the key changes, and the form starts again from the new era. The viewer does the same with `<EventPanel key={selected.id} … />` so its fade-in animation replays for each event.

## 8. Events and forms

### Handling events

Pass a function to `onClick`, `onChange`, `onSubmit` and so on:

```tsx
<button className="btn" onClick={() => exportTimeline(timeline)}>Export</button>
```

Note the arrow function. `onClick={exportTimeline(timeline)}` would *call* `exportTimeline` during render and pass its result as the handler, which is a classic bug.

React passes the handler an event object. `e.preventDefault()` and `e.stopPropagation()` work as in plain DOM code.

### Controlled inputs

A **controlled input** gets its value from state and reports every change back:

```tsx
<input
  value={newTitle}
  onChange={(e) => setNewTitle(e.target.value)}
  placeholder="New timeline title"
/>
```

React is the "single source of truth": the box shows exactly what's in `newTitle`. If you forget the `onChange`, the box looks frozen, because every keystroke is immediately overwritten by the unchanged state.

Almost every input in the editor is controlled, through the `draft` from `useDraft`:

```tsx
<input value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
```

### Submitting forms

```tsx
function handleCreate(e: FormEvent) {
  e.preventDefault(); // stop the browser's default full-page form submit
  …
}

<form className="create-form" onSubmit={handleCreate}>
  <input … />
  <button className="btn btn-primary">Create</button>
</form>
```

A `<button>` inside a `<form>` is a **submit button by default**. That bit us: the 3D map's labels are buttons, and the map sits inside the place form, so clicking a label would have saved the form. Hence `type="button"` on every non-submit button inside a form ([`GalaxyMap.tsx`](../src/components/map/GalaxyMap.tsx), [`MultiPicker.tsx`](../src/components/form/MultiPicker.tsx)).

### Inputs where the text isn't the value: `NumberInput`

A number box has a problem: while you type `-5`, the text is briefly `-`, which isn't a number. If the box were controlled by a number, `-` would become `NaN` or `0` and your typing would be destroyed. [`NumberInput.tsx`](../src/components/form/NumberInput.tsx) solves this by keeping **two** things: the text you're typing (its own state) and the number it reports to the parent (only when the text is valid):

```tsx
const [text, setText] = useState(toText(value));

<input
  value={text}
  aria-invalid={!valid || undefined}
  onChange={(e) => {
    setText(e.target.value);
    const result = parse(e.target.value);
    if (result.ok) {
      setSynced(result.value);
      onChange(result.value);
    }
  }}
/>
```

It also needs to update its text if the *parent* changes the number (say, clicking the map moves X). Section 10 covers how it does that without an effect.

### Select boxes as "add" buttons

[`MultiPicker.tsx`](../src/components/form/MultiPicker.tsx) uses a `<select>` whose value is always `""`:

```tsx
<select value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
  <option value="">{placeholder}</option>
  …
</select>
```

Picking an option fires `onChange` with that id, which gets added to the list, and because `value` is pinned to `""`, the select snaps back to the placeholder, ready for the next pick.

## 9. Lists and keys

Render a list with `.map()`, returning one element per item, each with a `key`:

```tsx
{timelines.map((t) => (
  <TimelineCard key={t.id} timeline={t} onError={setError} />
))}
```

**What `key` is for.** When a list changes, React matches old and new items by key to work out what was added, removed or moved. With stable keys, a card keeps its own state and DOM element when the list reorders. Without keys (or with the array index as the key), React matches by position, and state can end up attached to the wrong item.

Rules:

- Keys must be **unique among siblings** and **stable**: the same item gets the same key on every render. Ids are ideal.
- **Avoid the index** when items can be added, removed or reordered.
- Keys aren't passed to the component as a prop. If the child needs the id, pass it separately.

There are a few deliberate exceptions here. Era bands in [`TimelineTrack.tsx`](../src/components/viewer/TimelineTrack.tsx) use `key={seg.startIndex}`, which is fine because bands have no state of their own and are recalculated whenever events change. Sources use `key={s}`, the text itself, which assumes no duplicate lines.

As section 7 showed, keys are also a tool: change one on purpose to reset a component.

## 10. Effects

Rendering must be pure, but apps need to do things that aren't rendering: scroll an element, listen for key presses, sync to the URL, talk to the 3D camera. That's what **effects** are for. `useEffect(fn, deps)` runs `fn` **after** React has updated the page, and again whenever a value in `deps` has changed since last time.

### Example 1: doing something when a value changes

[`TimelineTrack.tsx`](../src/components/viewer/TimelineTrack.tsx) scrolls the selected node to the centre:

```tsx
useEffect(() => {
  if (!selectedId) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  nodeRefs.current.get(selectedId)?.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    inline: 'center',
    block: 'nearest',
  });
}, [selectedId]);
```

It must be an effect: during render the node's DOM element might not exist yet, and scrolling isn't "describing the screen". The dependency list `[selectedId]` means "run after the first render, then only when `selectedId` changes".

### Example 2: subscribing, with cleanup

[`TimelineViewer.tsx`](../src/components/viewer/TimelineViewer.tsx) listens for arrow keys on the whole window:

```tsx
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    …
    e.preventDefault();
  }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [step, select, visible]);
```

The function an effect **returns** is its **cleanup**. React calls it before running the effect again and when the component disappears. Without it, every re-run would add another listener, and one key press would fire several times; leaving the page would leave listeners behind. **Anything you subscribe to in an effect, unsubscribe from in its cleanup.**

The `closest(...)` check stops arrow keys being hijacked while you type in the search box.

### Example 3: syncing to something outside React (the URL)

The selected event is React state, mirrored into the address bar:

```tsx
useEffect(() => {
  if (params.get('event') === selectedId) return;
  const next = new URLSearchParams(params);
  if (selectedId) next.set('event', selectedId);
  else next.delete('event');
  setParams(next, { replace: true });
}, [selectedId, params, setParams]);
```

Look at the guard on the first line. `setParams` changes the URL, which gives `params` a new value, which re-runs this effect. Without the guard, it would set the URL again, forever. **Any effect that changes one of its own dependencies needs a condition that stops it.**

### Example 4: reporting upwards

[`useDraft.ts`](../src/components/editor/useDraft.ts) tells the editor whether a form has unsaved changes:

```tsx
useEffect(() => {
  onDirtyChange(dirty);
}, [dirty, onDirtyChange]);

// When the form goes away, it no longer has unsaved changes
useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
```

The second effect does nothing on mount; it only *returns* a cleanup, which runs when the form unmounts.

### The dependency array

| You write | It runs |
|---|---|
| `useEffect(fn)` | After **every** render (rarely what you want) |
| `useEffect(fn, [])` | Once, after the first render (plus cleanup on unmount) |
| `useEffect(fn, [a, b])` | After the first render, and whenever `a` or `b` changed |

**List every value from the component that the effect uses.** If you leave one out, the effect keeps using the old value from when it last ran (a "stale closure"). The `react-hooks/exhaustive-deps` lint rule checks this for you; treat its warnings as bugs.

Sometimes you *want* an effect to re-run on a value it doesn't read. The camera rig in [`GalaxyMap.tsx`](../src/components/map/GalaxyMap.tsx) lists `resetCount` so the "Reset view" button can re-trigger the flight:

```tsx
useEffect(() => {
  …fly to focus or home…
  // resetCount isn't read inside, but changing it re-runs the effect
}, [focusKey, resetCount, pullBack]);
```

Also note `focusKey = focus ? focus.join(',') : ''`. `focus` is an array, and a new array is created on each render even when the numbers are the same, so depending on it directly would re-fly the camera on every render. Turning it into a string gives a dependency that only changes when the position really does.

### StrictMode runs effects twice in development

In development, `<StrictMode>` mounts each component, unmounts it, and mounts it again. So every effect runs, cleans up, and runs again. That's on purpose: if your cleanup is missing or wrong, you'll notice straight away (two listeners, two fetches) instead of in production. If something happens twice in development, check the cleanup first.

### When *not* to use an effect

Effects are for talking to things **outside** React. A common mistake is using them to keep one piece of state in sync with another:

```tsx
// ❌ Don't: an extra render, and a moment where text and value disagree
useEffect(() => { setText(String(value)); }, [value]);
```

`NumberInput` needs exactly this behaviour (when the parent changes the number, show the new number), so it uses React's recommended alternative, **adjusting state during render**:

```tsx
const [synced, setSynced] = useState(value);

if (value !== synced) {
  setSynced(value);
  setText(toText(value));
}
```

React allows setting state during render *for the same component*, as long as it's guarded so it doesn't loop. It notices, throws away the half-finished render, and immediately renders again with the new state, before anything reaches the screen.

Other things that don't need effects: derived values (just calculate them), and responding to a click (do it in the click handler).

## 11. Refs

`useRef(initial)` gives you a box, `{ current: initial }`, that survives re-renders. Unlike state, **changing `ref.current` doesn't re-render anything**. Refs have two uses.

### Use 1: getting hold of a DOM element

The home page hides the real file input and opens it from a nicer button. [`HomePage.tsx`](../src/pages/HomePage.tsx):

```tsx
const fileInput = useRef<HTMLInputElement>(null);

<button className="btn" onClick={() => fileInput.current?.click()}>Import file…</button>
<input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={…} />
```

React fills `fileInput.current` with the `<input>` element once it exists, and sets it back to `null` when the element goes away. Hence the `?.`.

**Many elements: a ref callback.** The timeline needs a handle on *every* node to scroll to whichever is selected. Instead of an object, you can pass `ref` a function, which React calls with the element (and with `null` when it's removed). [`TimelineTrack.tsx`](../src/components/viewer/TimelineTrack.tsx) keeps them in a `Map`:

```tsx
const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

<TimelineNode
  ref={(el) => {
    if (el) nodeRefs.current.set(event.id, el);
    else nodeRefs.current.delete(event.id);
  }}
  …
/>
```

The scroll effect then does `nodeRefs.current.get(selectedId)?.scrollIntoView(…)`.

**Refs to non-DOM objects.** The camera rig holds the drei camera controls in a ref so the effect can call `controls.current.setLookAt(…)`. Same idea; the thing in the box is a three.js object instead of an element.

### Use 2: remembering a value without re-rendering

The editor needs to know "are there unsaved changes?" when you try to leave. The forms report this on every change. If it were state, each keystroke would re-render the whole editor for nothing, since nothing on screen depends on it. So [`EditorPage.tsx`](../src/pages/EditorPage.tsx) uses a ref:

```tsx
const dirtyRef = useRef(false);
const setDirty = useCallback((dirty: boolean) => {
  dirtyRef.current = dirty;
}, []);
```

The navigation blocker reads `dirtyRef.current` at the moment you try to navigate, so it always gets the latest value.

**State or ref?** If changing it should change what's on screen, use state. If it's just something the code needs to remember, use a ref. And **don't read or write `ref.current` during render** (except to initialise it). Render must depend only on props and state, or the screen won't update when you expect.

## 12. Memoising: `useMemo` and `useCallback`

Every render re-runs the whole component function. Usually that's cheap and fine. Two hooks let you skip work when the inputs haven't changed.

### `useMemo`: remember a calculated value

```tsx
// TimelineViewer: only re-sort when the events change
const events = useMemo(() => [...timeline.events].sort(compareEvents), [timeline.events]);
```

React runs the function on the first render and stores the result. On later renders it compares the dependencies with last time (using `Object.is`, i.e. "same reference?"); if they match, it hands back the stored result without calling the function.

The galaxy is the clearest case. Generating 30,000 stars is real work, and it must not happen on every render. [`GalaxyMap.tsx`](../src/components/map/GalaxyMap.tsx):

```tsx
const configKey = JSON.stringify(config);
const { positions, colors } = useMemo(() => generateGalaxy(JSON.parse(configKey)), [configKey]);
```

Why the string? `config` comes from the database, and Dexie hands back a **new object** every time the timeline is saved, even if the galaxy settings didn't change. Depending on `config` would regenerate the stars whenever you edited an event's title. The JSON string only changes when the actual settings do.

### `useCallback`: remember a function

Every render creates new function objects. Usually that doesn't matter, but sometimes a function is a **dependency** of an effect or a memo. If it's new every render, that effect re-runs every render. `useCallback(fn, deps)` returns the same function until the deps change:

```tsx
const isVisible = useCallback((e: TimelineEvent) => matchesFilters(e, filters), [filters]);
const visible = useMemo(() => events.filter(isVisible), [events, isVisible]);
```

`isVisible` only changes when the filters do, so `visible` is only recalculated when the filters or events change. `step`, `neighbourOf` and `setDirty` are wrapped for the same reason: effects and the router's blocker depend on them.

`useCallback(fn, deps)` is exactly `useMemo(() => fn, deps)`. It's a shorthand.

### Don't memoise everything

Memoising has a cost (storing values, comparing deps) and makes code harder to read. Reach for it when a value is expensive, or when a value or function is a dependency of an effect, memo or callback and needs a stable identity. Plenty of derived values in this project (`erasWithEvents`, `status`) are just recalculated each render, and that's fine.

## 13. Custom hooks and the rules of hooks

### What hooks are

Functions starting with `use` (`useState`, `useEffect`, `useRef`…) are **hooks**. They let a component keep things between renders. React tracks them **by call order**: the first `useState` in a component is "state slot 1", the second is "slot 2", and so on, every render.

### The rules of hooks

That ordering is why there are two rules:

1. **Only call hooks at the top level** of a component or custom hook: not inside `if`, loops, nested functions, or after an early `return`.
2. **Only call hooks from components or custom hooks**, not from plain functions.

If a hook is skipped on one render, every hook after it gets the wrong slot. This is why [`TimelineViewer.tsx`](../src/components/viewer/TimelineViewer.tsx) does its early return for an empty timeline **after** all its hooks:

```tsx
const step = useCallback(…);
useEffect(…);                         // all hooks first…

if (events.length === 0) {            // …then the early return
  return <div className="empty">…</div>;
}
```

ESLint's `react-hooks/rules-of-hooks` rule catches mistakes here.

### Writing your own

A **custom hook** is a function that starts with `use` and calls other hooks. It's how you share stateful logic between components. Four of them in this project:

**`useTimelines()` and `useTimeline(id)`** in [`db/timelines.ts`](../src/db/timelines.ts) wrap Dexie's `useLiveQuery`:

```tsx
export function useTimeline(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.timelines.get(id)) ?? null) : null), [id]);
}
```

Components just call `useTimeline(id)` and get data that stays up to date, without knowing Dexie exists.

**`usePref(key, fallback)`** in [`lib/prefs.ts`](../src/lib/prefs.ts) is `useState` that also saves to `localStorage`:

```tsx
export function usePref<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readPref(key, fallback));
  const set = useCallback(
    (next: T) => {
      setValue(next);
      writePref(key, next);
    },
    [key],
  );
  return [value, set] as const;
}
```

The viewer uses it exactly like `useState`: `const [showMap, setShowMap] = usePref('viewer.showMap', true);`. (`as const` makes the return type a fixed pair rather than an array of either type.)

**`useDraft(original, onSave, onDirtyChange)`** in [`editor/useDraft.ts`](../src/components/editor/useDraft.ts) is the engine of every editor form:

```tsx
export function useDraft<T>(original: T, onSave: (value: T) => Promise<void>, onDirtyChange: (dirty: boolean) => void) {
  const [draft, setDraft] = useState(original);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  …effects that report `dirty`…
  const patch = (changes: Partial<T>) => setDraft((d) => ({ ...d, ...changes }));
  async function submit(e: FormEvent, clean: (value: T) => T = (v) => v) { … }
  return { draft, patch, dirty, saving, submit, reset: () => setDraft(original) };
}
```

All five forms (era, faction, place, event, settings) use it, so "edit a copy, know if it changed, save it, revert it" is written once. Each form gets **its own** state: hooks share logic, not data. Two components calling `useDraft` have two separate drafts.

## 14. Reusable components: generics, render props and children

### A generic component: `CollectionTab<T>`

The Eras, Factions, Places and Events tabs all look the same: a list on the left, a form on the right, New / Save / Delete. [`CollectionTab.tsx`](../src/components/editor/CollectionTab.tsx) is written once, for any item type `T` with an `id`:

```tsx
interface Props<T extends { id: string }> {
  items: T[];
  noun: string;
  blank: () => T;
  nameOf: (item: T) => string;
  renderRow: (item: T) => ReactNode;
  save: (timeline: Timeline, item: T) => Timeline;
  remove: (timeline: Timeline, id: string) => Timeline;
  renderForm: (props: FormProps<T>) => ReactNode;
  …
}

export default function CollectionTab<T extends { id: string }>({ … }: Props<T>) {
```

[`EditorPage.tsx`](../src/pages/EditorPage.tsx) fills in the specifics:

```tsx
<CollectionTab<Era>
  {...shared}
  items={eras}
  noun="era"
  blank={() => ({ id: '', name: '', color: '#8a6d2e', start, end: start })}
  nameOf={(e) => e.name}
  renderRow={(e) => ( <>…swatch, name, date…</> )}
  save={saveEra}
  remove={removeEra}
  renderForm={(p) => <EraForm {...p} calendar={timeline.calendar} />}
/>
```

TypeScript checks everything matches: `saveEra` must accept an `Era`, `renderRow` gets an `Era`, and so on. Try passing `saveFaction` to the eras tab and the compiler stops you.

Two things worth noticing:

- **`{...shared}` spreads an object as props.** `shared` holds the four props every tab needs (`timeline`, `itemId`, `onSelectItem`, `onDirtyChange`).
- **Functions that return JSX are props too.** `renderRow` and `renderForm` let the parent decide *what* to draw while `CollectionTab` decides *where* and *when*. This is the **render prop** pattern.

### Render props as `children`: `TimelineGate`

Three pages need "load the timeline from the URL; show Loading or Not found; otherwise show me the page". [`TimelineGate.tsx`](../src/components/TimelineGate.tsx) does that, and takes its children as a function that receives the loaded timeline:

```tsx
export default function TimelineGate({ children }: { children: (timeline: Timeline) => ReactNode }) {
  const { id } = useParams();
  const timeline = useTimeline(id);
  if (timeline === undefined) return <p className="muted">Loading…</p>;
  if (timeline === null) return ( …not found… );
  return <>{children(timeline)}</>;
}
```

```tsx
// pages/ViewerPage.tsx
<TimelineGate>
  {(timeline) => ( <div className="page">…<TimelineViewer timeline={timeline} /></div> )}
</TimelineGate>
```

Inside the function, `timeline` is guaranteed to exist, so the page code never handles the loading or missing cases.

[`EditorPage.tsx`](../src/pages/EditorPage.tsx) and [`MapPage.tsx`](../src/pages/MapPage.tsx) use the gate slightly differently: `{(timeline) => <Editor timeline={timeline} />}`. Why an extra `Editor` component? Because `Editor` calls hooks (`useSearchParams`, `useRef`, `useBlocker`…), and hooks can't be called inside a plain callback function (rule 1). Making it a component gives the hooks a proper home.

### A component that picks its own tag: `Field`

```tsx
const Wrapper = group ? 'fieldset' : 'label';
const Title = group ? 'legend' : 'span';
return (
  <Wrapper className="field">
    <Title className="field-label">{label}</Title>
    …
```

A JSX tag can be a variable. Capitalise it so JSX treats it as a tag value, not the literal HTML tag `<wrapper>`. One input gets a `<label>`; a group of inputs gets a `<fieldset>` with a `<legend>`, which is the correct HTML for screen readers.

## 15. Lazy loading and Suspense

three.js is big. Most visits never open a map, so it shouldn't be in the main download. [`map/LazyGalaxyMap.ts`](../src/components/map/LazyGalaxyMap.ts):

```tsx
export const GalaxyMap = lazy(() => import('./GalaxyMap'));
```

`import('./GalaxyMap')` (an import as a function call) is a **dynamic import**. Vite sees it and puts `GalaxyMap.tsx`, three.js, r3f and drei in a **separate file**. `lazy` wraps it in a component that downloads that file the first time it's rendered.

While it downloads, there's nothing to show yet, so `lazy` components must sit inside a `<Suspense>` boundary, which shows a fallback meanwhile:

```tsx
<Suspense fallback={<p className="map-loading">Charting the galaxy…</p>}>
  <GalaxyMap config={map} places={timeline.places} … />
</Suspense>
```

Run `npm run build` and look at the output: there's an `index-….js` and a separate, larger `GalaxyMap-….js`. Only visitors who open a map download the second one.

`Suspense` is more general than code splitting: any component can "suspend" while it waits for something, and the nearest boundary above it shows its fallback. In this project it's only used for lazy loading.

## 16. Where every piece of state lives

When you're lost in a React app, ask "where does this value live, and who changes it?". Here's the whole of Chronicle:

| What | Where it lives | Who changes it | Why there |
|---|---|---|---|
| The timelines themselves | **IndexedDB** via Dexie | `db/timelines.ts` functions | Must survive reloads; read with `useLiveQuery` so every screen updates |
| Which page you're on, which timeline | **URL path** (`/t/:id/edit`) | Links, `navigate()` | Shareable, back button works |
| Selected event in the viewer | **React state** in `TimelineViewer`, mirrored to `?event=` | Clicks, arrows, keys | State for speed and chaining key presses; URL for links and refresh |
| Selected place on the map page | **URL** `?place=` | `setParams` in `MapPage` | Simple; nothing else needs it |
| Editor tab and item | **URL** `?tab=events&item=…` | `go()` in `EditorPage` | Links from the viewer can open a specific item; back button works |
| Search and filters | **React state** in `TimelineViewer` | `ViewerToolbar` | Temporary; fine to lose on reload |
| A form's unsaved edits | **React state** in `useDraft` | Inputs | Per form; reset by `key` |
| "Has unsaved changes" | **Ref** in `EditorPage` | Forms via `onDirtyChange` | Read at navigation time; nothing on screen depends on it |
| "Show the map" | **localStorage** via `usePref` | Map toggle | A per-browser preference |
| Text being typed in a number box | **React state** in `NumberInput` | Keystrokes | So half-typed values like `-` survive |
| Camera position | **three.js** (inside drei's controls) | Mouse, and `setLookAt` in an effect | Lives outside React entirely |

### One Context, and no Redux or Zustand

**Context** (`createContext` + `useContext`) passes a value to deeply nested components without threading it through every layer of props. Libraries like Redux and Zustand are global stores for state many distant components share.

The app has exactly one Context, and it's a good example of when to use it. **Published** timelines (files the site serves, see [`db/published.ts`](../src/db/published.ts)) and read-only sites must hide every Edit link. Those links are scattered: the page header, the info box (three levels down in the viewer), the map page. Passing a `canEdit` prop through `TimelineViewer` just so `EventPanel` can read it would be noise. So [`canEdit.ts`](../src/components/canEdit.ts) creates a context:

```ts
export const CanEditContext = createContext(true);   // true = the default outside any provider
export const useCanEdit = () => useContext(CanEditContext);
```

`TimelineGate`, which already knows whether the timeline is published, provides it once around the whole page:

```tsx
return <CanEditContext value={canEdit}>{children(entry.timeline)}</CanEditContext>;
```

(In React 19 the context itself is the provider; older code writes `<CanEditContext.Provider value={…}>`.) Any component inside can now call `useCanEdit()`. Most use the small [`EditOnly`](../src/components/EditOnly.tsx) wrapper, which renders its children only when editing is allowed:

```tsx
<EditOnly>
  <Link className="btn" to={`/t/${timeline.id}/edit`}>Edit</Link>
</EditOnly>
```

Why a wrapper component instead of calling `useCanEdit()` in `ViewerPage`? Because `ViewerPage`'s header is built inside `TimelineGate`'s render-prop function, which runs *while TimelineGate renders*, above the provider it returns. A hook called there would read the default value. `EditOnly` is rendered *inside* the provider, so it reads the real one. This is a common Context gotcha: a component can only see providers above it in the tree.

Why not a global store? The only other state distant components share is the timeline data, and Dexie's live queries already act like one: any component can call `useTimeline(id)` and they all update together. Everything else is owned by one component or passed down a level or two.

---

# Part 3: The libraries around React

## 17. React Router: pages and the URL

A single-page app has one HTML page, but users still expect URLs, links and a working back button. React Router provides them: it watches the address bar and decides which components to render, without reloading the page.

### Defining routes

[`App.tsx`](../src/App.tsx):

```tsx
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/t/:id', element: <ViewerPage /> },
      { path: '/t/:id/edit', element: <EditorPage /> },
      { path: '/t/:id/map', element: <MapPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

- The outer route has no `path`, only an `element`. It's a **layout route**: it always renders `Layout`, and the matching child appears where `Layout` puts `<Outlet />`.
- `:id` is a **URL parameter**. On `/t/abc123/edit`, the editor reads it with `const { id } = useParams();` (done once, in `TimelineGate`).
- `createBrowserRouter` is the "data router" style. It's required for some features, such as `useBlocker` below.

### Moving around

| Tool | Use it for | Example |
|---|---|---|
| `<Link to="…">` | Normal links. Renders an `<a>`, but navigates without a reload. | `<Link className="btn" to={`/t/${timeline.id}/edit`}>Edit</Link>` |
| `useNavigate()` | Navigating from code, after something finishes | `navigate(`/t/${t.id}/edit`)` after creating a timeline in `HomePage` |
| `useSearchParams()` | Reading and writing the `?a=b` part | `params.get('event')`, `setParams(next, { replace: true })` |

`setParams(next)` adds a browser history entry, so Back undoes it. `{ replace: true }` replaces the current entry instead. The viewer uses `replace` so stepping through 30 events doesn't need 30 presses of Back; the editor's tabs don't, so Back returns to the previous tab.

### The URL as state

Several pieces of state in this app live in the URL ([section 16](#16-where-every-piece-of-state-lives)). That gives you sharing, refreshing and the back button for free. The editor's tab and selected item are read straight from it, with a safe default:

```tsx
const tab: Tab = TABS.find((t) => t === params.get('tab')) ?? 'events';
const itemId = params.get('item');
```

If someone types `?tab=nonsense`, `find` returns `undefined` and the editor falls back to Events.

### Blocking navigation: `useBlocker`

To warn about unsaved changes, [`EditorPage.tsx`](../src/pages/EditorPage.tsx) asks the router to hold any navigation while the form is dirty:

```tsx
const blocker = useBlocker(
  useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current &&
      (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
    [],
  ),
);
useEffect(() => {
  if (blocker.state !== 'blocked') return;
  if (window.confirm('You have unsaved changes. Discard them?')) {
    dirtyRef.current = false;
    blocker.proceed();
  } else {
    blocker.reset();
  }
}, [blocker]);
```

The function is asked "should this navigation be blocked?" each time one starts. When it says yes, `blocker.state` becomes `'blocked'`, the component re-renders, and the effect asks the user. Because tab and item changes are URL changes too, this one mechanism covers switching items, switching tabs, clicking "View timeline" and the browser's Back button.

It can't catch closing the browser tab, which never goes through the router. A plain `beforeunload` listener (the effect just below it) handles that.

## 18. Dexie: the database in the browser

### IndexedDB and Dexie

Every browser has **IndexedDB**, a database that stores JavaScript objects on the user's machine. Its raw API is awkward, so the project uses **Dexie**, a small library that makes it promise-based and pleasant. [`db/db.ts`](../src/db/db.ts):

```ts
export const db = new Dexie('timeline-builder') as Dexie & {
  timelines: EntityTable<Timeline, 'id'>;
};

db.version(1).stores({
  timelines: 'id, title, updatedAt',
});
```

- `'timeline-builder'` is the database name (DevTools → Application → IndexedDB shows it).
- `stores` declares tables. The string lists the **primary key first** (`id`), then fields to **index** for sorting or searching. Other fields (`events`, `eras`…) are stored but not indexed.
- `version(1)` matters later: to change the schema, add `db.version(2).stores({...})` and Dexie upgrades existing databases.

Each timeline is **one document** with its events, eras, factions and places nested inside. That keeps saving, exporting and importing simple: a timeline is a single object, and a `.json` file is that object.

### Reading: live queries

[`db/timelines.ts`](../src/db/timelines.ts):

```ts
export function useTimelines() {
  return useLiveQuery(() => db.timelines.orderBy('updatedAt').reverse().toArray());
}
```

`useLiveQuery` (from `dexie-react-hooks`) runs the query, returns the result, and **re-runs it whenever the data it read changes**, re-rendering the component. That's why saving in the editor updates the timeline view, the home page cards and the tab counts without any code telling them to.

It returns `undefined` until the first result arrives. `useTimeline` adds a convention on top: `undefined` means loading, `null` means "doesn't exist":

```ts
export function useTimeline(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.timelines.get(id)) ?? null) : null), [id]);
}
```

The `[id]` at the end is a dependency list, like an effect's: if the URL's id changes, the query restarts for the new timeline.

### Writing: functions, not hooks

Writes are plain async functions (`createTimeline`, `deleteTimeline`, `exportTimeline`…) that components call from event handlers. The important one is `updateTimeline`:

```ts
export async function updateTimeline(id: string, recipe: (timeline: Timeline) => Timeline) {
  await db.transaction('rw', db.timelines, async () => {
    const current = await db.timelines.get(id);
    if (!current) throw new Error('Timeline not found');
    await db.timelines.put({ ...recipe(current), id, updatedAt: Date.now() });
  });
}
```

You pass a **recipe**: a function from the current timeline to the new one (section 19). The read and write happen inside a **transaction**, so two quick saves can't interleave and lose each other's changes. Every save in the editor goes through here.

### Why components never import `db`

All database code is in `db/`. Components call `useTimeline` or `updateTimeline` and never touch Dexie. If the app ever moved to a server, only that folder would change. It's the same idea as Polyphemus keeping Prisma behind its loader functions.

### Import, export and the demo

- **Export** turns the timeline into JSON, wraps it in a `Blob`, creates a temporary object URL and clicks an invisible `<a download>`. That's the standard way to save a file from the browser.
- **Import** reads the chosen file with `file.text()`, parses it, checks and upgrades it with `parseTimeline` ([`lib/validate.ts`](../src/lib/validate.ts)), and stores it under a **new id** (`addCopy`), so an import never overwrites an existing timeline.
- **The demo** is a separate website (a fan timeline built on Chronicle), so "View demo" is just a link. Its address comes from [`brand.ts`](../src/brand.ts).

### Upgrading old data

The data model has a version number, `SCHEMA_VERSION`. When the shape changes (version 2 replaced each date's stored label with a calendar), old timelines still have to work: ones already in the browser, and files exported months ago. [`lib/upgrade.ts`](../src/lib/upgrade.ts) holds one step per version (`v1to2`), and `upgradeTimeline` runs whichever steps a timeline needs. It's called from two places:

- **Dexie's own versioning** in [`db.ts`](../src/db/db.ts): `db.version(2)….upgrade(…)` rewrites every stored timeline once, the first time the new code opens the database.
- **`parseTimeline`**, for imported and seeded files.

### Branding

[`brand.ts`](../src/brand.ts) reads `import.meta.env.VITE_BRAND_NAME` and friends. Vite replaces these with values from a `.env` file at build time; only variables starting with `VITE_` are exposed to the browser. A site sets its name, default theme, demo link and published timelines there.

### Themes are data

A theme ([`types/theme.ts`](../src/types/theme.ts)) is a plain object: colours, three fonts, a corner radius, a node shape and a handful of ornament switches. Four built-in **presets** live in code ([`themes/presets.ts`](../src/themes/presets.ts)); themes you make are stored in the browser in a second Dexie table, `themes` ([`db/themes.ts`](../src/db/themes.ts)). A timeline only stores the theme's **id**, which is why switching themes is one click: it changes one field.

How a theme reaches the screen ([`themes/apply.ts`](../src/themes/apply.ts)):

- Colours, fonts and sizes become **CSS custom properties** on `<html>`: `root.style.setProperty('--accent', theme.colors.accent)`. Everything in `index.css` already uses `var(--accent)`, so it all changes at once.
- Switch-like options become **data attributes**: `data-node="diamond"`, `data-frame="engraved"`. The bottom of `index.css` has one block per option, e.g. `:root[data-node='diamond'] .node-dot { transform: rotate(45deg); }`.
- Fonts are loaded on demand by adding a Google Fonts `<link>` to the page.

So the styling all lives in one stylesheet, and a theme just flips its switches. That's what lets you build a theme in the app instead of writing CSS.

Applying the theme is a **side effect**: it changes `<html>`, outside anything React renders. So `useTheme` (called by `TimelineGate`) does it in a `useEffect` and puts the site default back in the cleanup, when you leave the timeline. The hook is called *above* `TimelineGate`'s early returns: hooks must run on every render, in the same order.

**Live preview** needs the theme editor, deep inside the editor page, to override what `TimelineGate` applies. Two components both calling `useTheme` would fight (child effects run before parent effects, so the parent would win on mount). Instead `TimelineGate` keeps a `preview` state and passes its setter down through a second Context, `ThemeOverrideContext` ([`themeOverride.ts`](../src/components/themeOverride.ts)). The editor calls `useThemeOverride(draft)`; `TimelineGate` applies `preview ?? savedTheme`. One owner, no fight: the same "lift state up" idea as everywhere else, with Context doing the lifting across many levels.

**Themes travel with timelines.** Exporting a timeline adds a full copy of its theme (`themeDef`). Importing calls `ensureTheme`, which reuses an identical theme, saves a new one, or saves a copy if a *different* theme already has that id, so an import never overwrites your work. [`normalizeTheme`](../src/themes/normalize.ts) fills in anything a file is missing from the default theme, so older or hand-written files still work.

### Exporting a timeline as a website

**Edit → Website → Export website** turns one timeline into a zip you can upload to any static host ([`lib/exportSite.ts`](../src/lib/exportSite.ts)). There's no separate "viewer app": the website *is* Chronicle, copied file by file, plus three files that switch it into site mode:

- `timeline.json`: the timeline with its theme
- `site.json`: name, tagline, footer, "read-only", and which timeline to publish
- `index.html`: Chronicle's own page with `<meta name="chronicle-site" content="site.json">` added

How does the running app know which files to copy? `vite.config.ts` turns on Vite's **build manifest**, a JSON list of every file the build produced. The export fetches that list, then each file, and zips them in the browser with `fflate`. That's also why it only works from a *built* copy (`npm run serve:built`): the dev server compiles files on demand and has no list.

When the exported site starts, [`brand.ts`](../src/brand.ts)'s `loadSiteConfig` sees the meta tag, reads `site.json` and lays it over `brand` **before React renders** (`main.tsx` waits for it). Everything else follows from settings you've already met: published timelines, read-only mode and the theme.

Two details make the site work on any host, in any folder:

- **Relative paths.** `base: './'` makes the built `index.html` load `./assets/…` instead of `/assets/…`, so the site works at `example.com/` or `example.com/my-site/`. Chronicle's own `index.html` adds `<base href="/">` so its deep links (`/t/x/edit`) still find the assets; the export removes that tag.
- **Hash links.** A static host only has `index.html`. A link like `/t/x` would 404 when reloaded. With `createHashRouter` the route lives after `#` (`#/t/x`), which the browser never sends to the server. [`App.tsx`](../src/App.tsx) picks the hash router only for exported sites.

### Faction themes and main factions

Each event can mark one of its factions as its **main faction** (`mainFactionId`, the ★ in the event form). It sets the node's colour, and it's what the theme follows.

A faction can pick a theme (`themeId`). `TimelineViewer` works out a **focus theme** on every render: the selected event's main faction's theme, or, with nothing selected, the theme of a filter on exactly one faction. `factionThemeId` in [`lib/factions.ts`](../src/lib/factions.ts) walks up the faction tree, so a sub-faction without a theme uses its parent's.

The viewer hands that theme to `useThemeOverride`, the same Context the theme editor uses for its live preview. `TimelineGate` still owns the one place where a theme is applied; it just shows `override ?? savedTheme`. That's the payoff of having built the override as a general mechanism: a second feature reused it without any changes to `TimelineGate`.

### Many maps, nested

A timeline can have the 3D starmap plus any number of **flat maps** (`timeline.maps`): your own pictures, each stored in the timeline as a `data:` URL. A place has one 3D `position` and a `pins` object with one position per flat map (`{ [mapId]: [x, y] }`), as fractions of the picture's size (0–1), so pins stay put however big the map is drawn. A place can be on several maps, or none.

Maps **nest like factions**: each flat map may have a `parentId` (another flat map, or `'starmap'`) and a `placeId`, the place on the parent map that opens it. Clicking that place's pin goes into the child map (galaxy → region → city), and breadcrumbs go back up. [`lib/maps.ts`](../src/lib/maps.ts) mirrors `lib/factions.ts`: `allMaps` turns the starmap and the flat maps into one list of `MapEntry`s so nothing else has to care which kind a map is, then `mapTree`, `mapAncestry` (the breadcrumbs) and `mapWithDescendants` (the maps a map can't be moved into, so the tree can't loop) work on that list. Unlike factions, sibling maps keep the order you arrange them in rather than going alphabetical.

When the shape changed (one `flatMap` became the `maps` list, `pin` became `pins`), `v3to4` in [`lib/upgrade.ts`](../src/lib/upgrade.ts) moved old timelines over: the single map becomes the first in the list, and each pin moves onto it.

[`FlatMap.tsx`](../src/components/map/FlatMap.tsx) is a good small study in direct DOM work from React:

- **`ResizeObserver`** in an effect refits the picture whenever its box changes size (the window `resize` event misses layout changes).
- **Pointer events** with `setPointerCapture` handle dragging with mouse, pen or finger alike. A drag of a few pixels still counts as a click, so placing a pin isn't fiddly.
- **One transformed layer**: the picture and its pins move together with a single CSS `translate(...) scale(...)`. Each pin sits in a zero-size anchor scaled by `1 / scale`, so labels stay readable at any zoom.
- The wheel listener is added by hand with `{ passive: false }`, because React's `onWheel` can't call `preventDefault()` to stop the page scrolling.

[`TimelineMap.tsx`](../src/components/map/TimelineMap.tsx) shows whichever map its parent picks (`mapId`), with the breadcrumbs and a picker of every map. The viewer keeps the map in state and starts on the **master map** (`masterMapId`); selecting an event whose places aren't on the map shown switches to a map that has one. The map page keeps it in the URL (`?map=…`), so the back button steps back out of a map. Maps are added, arranged and linked in the editor's **Maps** tab ([`MapsPanel.tsx`](../src/components/editor/MapsPanel.tsx)); places are pinned on them in the **Places** tab, which a map's "Pin places" button opens with that map already chosen (`?tab=places&map=…`).

The starmap is drawn by three.js, which needs real colour values rather than CSS, so it can't pick up a theme the way the rest of the page does. [`themes/palette.ts`](../src/themes/palette.ts) bridges the gap: `useThemePalette` reads the theme's colours from the CSS variables on `<html>` and uses **`useSyncExternalStore`** (React's hook for reading something outside React) with a `MutationObserver` to re-render whenever a theme is applied. Because it reads what's on the page, the galaxy follows faction themes and the theme editor's preview too. Set to "From the theme" in the Starmap tab, the arms take the accent colour and the core the highlight; "My own" uses the colours stored in the timeline.

### Characters, and [[links]] in text

**Characters** (`timeline.characters`) work like places: events list who's in them (`characterIds`), the same way they list places. The character form also lets you pick their events, but the link is still stored on the events, so [`saveCharacterWithEvents`](../src/lib/mutations.ts) adds or removes the character on each event. One source of truth, two ways to edit it.

**[[Links]]** show a trick for extending a library you don't control. `react-markdown` knows nothing about `[[Siege of Brightvale]]`, so [`RichText.tsx`](../src/components/RichText.tsx) does it in two steps:

1. **Rewrite the text first.** [`linkify`](../src/lib/links.ts) turns each `[[Name]]` into an ordinary Markdown link with a made-up address, `[Name](link:event:siege-brightvale)`. That's a plain string-to-string function in `lib/`, easy to test.
2. **Render links your way.** `react-markdown` takes a `components` prop: your own component for each HTML tag. RichText's `a` reads the `link:` address and returns a router `<Link>`, so the page changes without a reload. (`urlTransform` keeps those addresses; by default react-markdown drops unknown ones for safety.)

Renaming something rewrites the `[[links]]` to its old name (`renameLinks`, called from the save functions), so links don't break.

## 19. Pure update functions and immutability

[`lib/mutations.ts`](../src/lib/mutations.ts) holds every change the editor can make, as **pure functions**: a timeline goes in, a new timeline comes out, and nothing is modified in place.

```ts
export function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export const saveEra = (t: Timeline, era: Era): Timeline => ({ ...t, eras: upsert(t.eras, era) });
```

`{ ...t, eras: … }` copies the timeline's fields into a new object and replaces `eras`. The events, factions and places arrays are reused, not copied, because they didn't change. That's called **structural sharing**: cheap, and anything that didn't change keeps its identity.

Why work this way?

- **React and Dexie notice changes by identity.** A new object means "changed".
- **They're easy to reason about and test.** `saveEvent(timeline, event)` has no hidden effects. You could test it with three lines and no browser.
- **They slot into `updateTimeline`.** `CollectionTab` saves with `updateTimeline(timeline.id, (t) => save(t, { ...item, id }))`, where `save` is whichever function the tab was given.

### Keeping references consistent

Deleting something has to clean up anything that points at it:

```ts
export const removeFaction = (t: Timeline, id: string): Timeline => ({
  ...t,
  factions: t.factions.filter((c) => c.id !== id),
  events: t.events.map((e) => ({ ...e, factionIds: without(e.factionIds, id) })),
});
```

And `saveEvent` keeps "related" links two-way: if event A now lists B, B gains A; if A drops B, B drops A. Read through it. It's a good example of a rule enforced in one place, so no component has to remember it.

## 20. The data model: dates, eras and filters

### One number to sort them all

Every date is stored as a single `sortKey` number, which sets its order. [`types/timeline.ts`](../src/types/timeline.ts):

```ts
export interface EventDate {
  sortKey: number;          // ordering; higher = later
  precision: DatePrecision; // 'exact', 'circa', … or 'period' ("M31": only the cycle is known)
  label?: string;           // only for free-text dates ("Time immemorial")
}
```

What you *see* comes from the timeline's **calendar**, another discriminated union (`years`, `ages`, `cycles`, `freeform`). [`lib/dates.ts`](../src/lib/dates.ts) converts both ways: `splitKey` turns a number into the calendar's parts (cycle 41, year 999), `joinKey` turns parts back into a number, and `formatKey`/`formatDate` build the label from the calendar's templates. With the "Numbered millennia" calendar (`{year}.M{cycle}`, 1000-year cycles):

| Date | Calculation | sortKey |
|---|---|---|
| `005.M31` | 30 × 1000 + 5 | 30005 |
| `999.M41` | 40 × 1000 + 999 | 40999 |
| `M31` (year unknown) | 30 × 1000, precision `period` | 30000 |
| 60 million years before M1 | negative | −60000000 |

The same number means different things in different calendars: 1066 is "1066" with years, "2A 66" with three 1000-year ages. Because labels aren't stored, changing the calendar relabels every date at once, and the order never changes. It also means the date inputs ([`DateInputs.tsx`](../src/components/form/DateInputs.tsx)) never hold their own state: they split the number, show the parts, and join the edited parts back into a number for the parent.

`compareEvents` sorts by `sortKey`, then title, so ties are stable.

### Eras as bands

An era is a `sortKey` range. `eraFor(sortKey, eras)` finds the one a date falls in. [`lib/eras.ts`](../src/lib/eras.ts)'s `eraSegments` walks the sorted events and groups consecutive ones that share an era. The track then draws one band per group, spanning those nodes. Because nodes are evenly spaced rather than to scale (a 60-million-year gap would otherwise swallow the screen), a band's width reflects how many events it holds, not how long the era lasted.

### Filters

[`lib/filters.ts`](../src/lib/filters.ts) answers one question: does this event pass the current filters?

```ts
export function matchesFilters(event: TimelineEvent, f: Filters, calendar: Calendar): boolean {
  if (f.factionIds.length > 0 && !event.factionIds.some((id) => f.factionIds.includes(id))) return false;
  if (f.placeId && !event.placeIds.includes(f.placeId)) return false;
  const q = f.query.trim().toLowerCase();
  if (q && ![event.title, event.summary, event.body, formatDate(event.date, calendar)].some((text) => text.toLowerCase().includes(q))) {
    return false;
  }
  return true;
}
```

### Nested factions

Factions can sit inside each other ("Imperium › Space Marines › Ultramarines"), to any depth. They're still stored as a **flat list**; each faction just has an optional `parentId`. [`lib/factions.ts`](../src/lib/factions.ts) builds the tree when it's needed:

- `factionTree` returns every faction in display order with its depth, using a small **recursive** function: `visit(faction)` adds the faction, then calls `visit` on each of its children. The editor's list and the viewer's dropdown use the depth for indenting.
- `withDescendants(id)` collects a faction and everything under it. The viewer uses it so that **filtering by a parent includes its children**: before filtering, `TimelineViewer` expands the picked ids (`expandFactions`), so `matchesFilters` above didn't need to change at all.
- Deleting a faction moves its children up to its parent (`removeFaction` in `mutations.ts`), and the faction form won't let you pick a faction's own descendant as its parent, which would create a loop. The helpers also cope with loops in hand-edited files rather than recursing forever.

Why a flat list with parent links, not nested objects? Moving a faction is then a one-field change, and the existing save/delete/upsert functions work unchanged.

Filtered-out events aren't removed from the timeline, just **dimmed**. Keeping every node in place means the line doesn't jump around as you type. The arrows skip dimmed events because `neighbourOf` only considers events where `isVisible` is true.

## 21. react-three-fiber: 3D as components

### The idea

Plain three.js is imperative: create a scene, create objects, add them, and run an animation loop that redraws every frame. **react-three-fiber** (r3f) lets you *declare* the scene as JSX instead, and keeps it in sync with your props and state like React does with the page.

Everything inside `<Canvas>` is the 3D scene. [`GalaxyMap.tsx`](../src/components/map/GalaxyMap.tsx):

```tsx
<Canvas camera={{ position: HOME, fov: 50, near: 0.1, far: 3000 }} dpr={[1, 2]}>
  <color attach="background" args={['#05050a']} />
  <Stars radius={700} depth={300} count={5000} factor={7} fade speed={0.4} />
  <GalaxyPoints config={config} />
  <CoreGlow color={config.coreColor} size={config.radius * 0.9} />
  {placed.map((place) => <PlaceMarker key={place.id} … />)}
  …
  <CameraRig … />
</Canvas>
```

`Canvas` creates the WebGL canvas, scene, camera and render loop. `dpr={[1, 2]}` renders at up to 2× resolution on high-density screens.

### Lowercase tags are three.js classes

Inside a Canvas, a lowercase tag means "new THREE.Something". The rules:

| JSX | three.js it creates |
|---|---|
| `<mesh>` | `new THREE.Mesh()` |
| `<sphereGeometry args={[1.1, 16, 16]} />` | `new THREE.SphereGeometry(1.1, 16, 16)`: `args` are constructor arguments |
| `<meshBasicMaterial color="#f2eee4" transparent opacity={0.45} />` | a material; other props set its properties |
| `<group position={[x, y, z]}>` | a `THREE.Group` positioned at x, y, z; children move with it |
| `<mesh rotation-x={-Math.PI / 2}>` | dashes reach into nested properties: `mesh.rotation.x = …` |
| `<color attach="background" args={['#05050a']} />` | `attach` says where to put it: `scene.background = new THREE.Color(…)` |

A geometry or material placed inside a `<mesh>` is attached to it automatically. When props change, r3f updates the three.js object; when a component unmounts, r3f removes the object and frees its GPU memory.

### The galaxy: 30,000 points in one object

Drawing 30,000 separate spheres would be far too slow. Instead the galaxy is one `<points>` object whose geometry holds all the positions and colours in typed arrays:

```tsx
<points key={configKey}>
  <bufferGeometry>
    <bufferAttribute attach="attributes-position" args={[positions, 3]} />
    <bufferAttribute attach="attributes-color" args={[colors, 3]} />
  </bufferGeometry>
  <pointsMaterial size={1.1} sizeAttenuation vertexColors map={texture}
                  transparent depthWrite={false} blending={AdditiveBlending} />
</points>
```

- `args={[positions, 3]}` means "this `Float32Array`, read 3 numbers per point (x, y, z)".
- `attach="attributes-position"` sets `geometry.attributes.position`.
- `map={texture}` draws each point as a soft glowing dot rather than a square. The texture is a radial gradient painted on a 2D `<canvas>` once (`makeGlowTexture`).
- `AdditiveBlending` adds overlapping colours together, which is why the dense core glows white.
- `key={configKey}` rebuilds the object if the settings change, since buffer sizes can't be changed in place.

[`map/galaxy.ts`](../src/components/map/galaxy.ts) generates the arrays. Each star picks an arm, a distance from the centre (`Math.pow(random(), 1.6)` pushes most stars inwards), and an angle that grows with distance, which is what curls the arms into a spiral. Random scatter softens them. The random numbers come from a **seeded** generator, so the galaxy is identical on every load and your places stay put relative to the arms.

### Events on 3D objects

r3f gives meshes DOM-like events, worked out by casting a ray from the mouse into the scene:

```tsx
<mesh
  onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(place.id); }}
  onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
  onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
>
```

`e.stopPropagation()` stops the click reaching objects behind it. Placing locations in the editor uses an invisible disc on the galaxy's plane (`PickPlane`). Its click handler reads `e.point`, the exact 3D spot hit, and ignores drags:

```tsx
onClick={(e) => {
  if (e.delta > 4) return;   // pointer moved more than 4px: that was a drag to rotate
  e.stopPropagation();
  onPick([round(e.point.x), 0, round(e.point.z)]);
}}
```

### drei helpers

- **`<CameraControls>`** gives orbit, zoom and pan with the mouse or touch. Through a ref, code can animate the camera: `controls.current.setLookAt(camX, camY, camZ, targetX, targetY, targetZ, true)`, where `true` means "animate".
- **`<Html>`** positions ordinary DOM elements at a 3D point. The place labels are real `<button>`s with CSS styling, so they're keyboard-focusable and crisp at any zoom.
- **`<Stars>`** is the background starfield.

### Reading the canvas from inside: `useThree`

Components inside `<Canvas>` can read r3f's state with `useThree`. The camera rig reads the canvas size to back the camera off on tall, narrow screens:

```tsx
const pullBack = useThree((s) => Math.round(Math.min(2.2, Math.max(1, s.size.height / s.size.width)) * 10) / 10);
```

The selector function means the component only re-renders when that number changes, not on every r3f state change. Rounding avoids re-flying the camera for every pixel of resizing.

`useThree` (and r3f's `useFrame`, for per-frame animation) only work **inside** `<Canvas>`, because that's where r3f's context lives. That's why `CameraRig` is its own component placed inside the Canvas.

## 22. Styling: CSS tokens and CSS variables from React

All styles are in one plain CSS file, [`index.css`](../src/index.css). No CSS framework.

**Design tokens.** Colours, radius and fonts are CSS custom properties on `:root`:

```css
:root {
  --bg: #121214;
  --surface: #1b1b1f;
  --accent: #c9a227;
  --radius: 8px;
  --font-display: 'Cinzel', Georgia, serif;
}
```

Everything else uses `var(--accent)` and so on, so changing the theme means changing a handful of lines.

**React passes numbers, CSS does the layout.** The timeline track doesn't calculate pixel positions in JavaScript. React sets a few CSS variables, and the stylesheet does the maths:

```tsx
// TimelineNode.tsx
style={{ '--i': index, '--node-color': color } as CSSProperties}
```

```css
.viewer { --gap: 170px; }
@media (max-width: 640px) { .viewer { --gap: 130px; } }

.node { position: absolute; left: calc(var(--i) * var(--gap)); width: var(--gap); }
.node-dot { border: 3px solid var(--node-color); }
```

The spacing changes on phones purely in CSS, and React never has to know. (The `as CSSProperties` cast is needed because TypeScript's style type doesn't know about custom `--` properties.)

**Inline `style` vs `className`.** Use classes for anything fixed. Use inline `style` only for values that come from data, like an era's colour or a node's index.

Other techniques worth recognising:

- **`color-mix(in srgb, var(--era-color) 26%, transparent)`** makes a translucent tint of any colour, used for era bands and chips.
- **`position: sticky`** keeps the editor's Save bar and the viewer's map in view while you scroll.
- **`@media (prefers-reduced-motion: reduce)`** turns off animations for people who've asked their OS for less motion. The scroll effect checks the same setting in JavaScript.
- **Accessibility attributes** do real work: `aria-pressed` on toggle buttons, `aria-live` so screen readers announce the info box and counters, `aria-invalid` (styled red) on bad number input, `aria-label` on icon-only buttons.

## 23. Tooling: Vite, TypeScript and ESLint

| Command | What it does |
|---|---|
| `npm run dev` | Starts Vite's dev server with **hot module replacement**: edits appear instantly, often without losing state. |
| `npm run build` | `tsc -b` type-checks the whole project (and fails on errors), then `vite build` bundles everything into `dist/`. |
| `npm run preview` | Serves the built `dist/` locally, to check the production build. |
| `npm run lint` | Runs ESLint. |

**Vite** reads `index.html`, follows the imports from `main.tsx`, and transforms TypeScript and JSX on the fly. `vite.config.ts` only adds the React plugin, which handles JSX and Fast Refresh. In a build, it splits code at dynamic `import()`s (section 15).

**TypeScript** settings are in `tsconfig.app.json`. Notable ones: `strict` (catches `undefined` mistakes), `noUnusedLocals` (fails on unused variables), `verbatimModuleSyntax` (type-only imports must say `import type`), and `erasableSyntaxOnly` (no `enum`s or other TypeScript features that generate code; that's why the project uses union types instead of enums).

**ESLint** (`eslint.config.js`) includes two React plugins:

- `react-hooks`: **rules-of-hooks** (section 13) and **exhaustive-deps** (section 10). Take these seriously; they catch real bugs.
- `react-refresh`: warns when a file exports both components and non-components, which breaks hot reloading for that file. That's why the filter helpers live in `lib/filters.ts` rather than next to `ViewerToolbar`.

---

# Part 4: Putting it together

Each walkthrough follows one user action through every file it touches. Open the files alongside.

## 24. Walkthrough A: importing a timeline file

**You click "Import file…" on the home page and pick a `.json` file.**

1. **A hidden input does the picking.** [`HomePage.tsx`](../src/pages/HomePage.tsx) has an `<input type="file" hidden>` and a ref to it. The button's handler calls `fileInput.current?.click()`, which opens the browser's file picker. Styling a real file input is awkward, so this is the usual trick.

2. **The input's `onChange` runs.** It calls `handleImport(e.target.files?.[0])`, which calls `run(async () => { await importTimelineFile(file) })`. `run` clears any error, sets `busy` to `true` (which disables the buttons on the next render) and awaits the work. It also resets the input's value, so picking the same file again still fires `onChange`.

3. **The file is read and parsed.** [`db/timelines.ts`](../src/db/timelines.ts): `JSON.parse(await file.text())`. Bad JSON throws "is not valid JSON".

4. **The data is checked and upgraded.** `parseTimeline(data)` ([`lib/validate.ts`](../src/lib/validate.ts)) throws a readable error if it isn't a timeline, then runs `upgradeTimeline`, so a file exported by an older version comes in with a calendar. If anything throws, `run`'s `catch` puts the message in `error` state and the red banner appears.

5. **It's stored as a copy.** `addCopy(timeline)` gives it a fresh `crypto.randomUUID()` id and timestamps, and calls `db.timelines.add(copy)`.

6. **The live query notices.** `HomePage` called `useTimelines()`, whose `useLiveQuery` is watching the `timelines` table. The new row triggers a re-run, which returns a longer array, and `HomePage` re-renders.

7. **The list renders.** `timelines.map((t) => <TimelineCard key={t.id} … />)` now includes the import. React sees a new key and creates one new `TimelineCard`, leaving the existing ones alone.

8. **`run` finishes.** `finally { setBusy(false) }` re-enables the buttons.

Notice what *didn't* happen: no code told the list to refresh. Saving to the database was enough. That's the payoff of live queries.

## 25. Walkthrough B: pressing → on the timeline

**You're viewing a timeline with event 3 selected, and press the right arrow key.**

1. **The window listener fires.** The keyboard effect in [`TimelineViewer.tsx`](../src/components/viewer/TimelineViewer.tsx) registered `onKey` on `window`. The target isn't an input, so it calls `step(1)` and `preventDefault()`, which stops the page scrolling sideways.

2. **`step` queues a functional update.** `setSelectedId((prev) => neighbourOf(prev, 1)?.id ?? prev)`. React runs the updater with the latest id. `neighbourOf` finds event 3 in the sorted list and returns the next one that passes the filters (`isVisible`). If there isn't one, `?? prev` keeps the current one.

3. **React re-renders `TimelineViewer`.** `selectedId` is now event 4's id, so `selected`, `position`, `status` ("4 / 14"), `currentEra` and `mapFocus` are all recalculated from it.

4. **Children get new props.**
   - `TimelineTrack` gets the new `selectedId`. Each `TimelineNode` compares `event.id === selectedId`; node 3's `selected` becomes `false` and node 4's `true`. React only touches those two nodes' class names in the page.
   - The info box was `<EventPanel key="event-3" …>` and is now `key="event-4"`. Different key, so React removes the old panel and mounts a new one, and its CSS fade-in plays.
   - If the map is showing, `GalaxyMap` gets new `highlightIds` and possibly a new `selectedPlaceId`.

5. **Effects run after the page updates.**
   - `TimelineTrack`'s effect sees `selectedId` changed and calls `scrollIntoView` on node 4's button (found in `nodeRefs`), sliding it to the centre.
   - `TimelineViewer`'s URL effect sees the URL still says event 3, so it calls `setParams(…, { replace: true })`. The address bar now says `?event=…4`. That changes `params`, which re-runs the effect, but now the guard sees they match and stops.
   - If event 4 has a place on the map, `CameraRig`'s effect sees a new `focusKey` and calls `setLookAt(…, true)`. drei animates the camera over the next frames.

6. **The keyboard effect re-subscribes.** `step` depended on `neighbourOf`, which depends on `isVisible` and `events`. Those didn't change, so `step` is the same function and the listener isn't touched. But `visible` is in its deps too; it didn't change either. (If you'd changed a filter, the cleanup would remove the old listener and add a fresh one.)

Press → five times quickly and steps 2–3 happen five times, each updater receiving the previous one's result. That's why the functional form matters.

## 26. Walkthrough C: editing and saving an event

**In the editor, you click an event, change its title, and press Save.**

1. **Clicking the row changes the URL.** In [`CollectionTab.tsx`](../src/components/editor/CollectionTab.tsx) the row's `onClick` calls `onSelectItem(item.id)`, which is `selectItem` in [`EditorPage.tsx`](../src/pages/EditorPage.tsx), which calls `go(tab, id)`, which calls `setParams({ tab: 'events', item: id })`. (Before that navigation happens, the blocker checks `dirtyRef.current`. It's `false`, so it goes ahead.)

2. **The editor re-renders from the URL.** `itemId` is now the event's id. `CollectionTab` finds it in `items`, and renders `<Fragment key={itemId}>{renderForm({ original: selected, isNew: false, … })}</Fragment>`. `renderForm` returns `<EventForm … timeline={timeline} />`.

3. **The form makes its draft.** [`EventForm.tsx`](../src/components/editor/EventForm.tsx) calls `useDraft(original, onSave, onDirtyChange)`. `useState(original)` copies the event into `draft`. `dirty` is `false`.

4. **You type.** The title input's `onChange` calls `patch({ title: e.target.value })`, which does `setDraft((d) => ({ ...d, title }))`. The form re-renders with the new draft; the input shows what you typed (it's controlled). Now `JSON.stringify(draft) !== JSON.stringify(original)`, so `dirty` is `true`.

5. **Dirty is reported up.** `useDraft`'s effect sees `dirty` change and calls `onDirtyChange(true)`, which sets `dirtyRef.current = true` in the editor. No re-render; it's a ref. The form shows "Unsaved changes" and enables Save, because `FormActions` gets `dirty={true}`.

   *(If you now clicked another event, the blocker would see `dirtyRef.current === true`, block the navigation, and the effect would `confirm()`. Cancel calls `blocker.reset()` and your edit stays.)*

6. **You press Save.** The `<form onSubmit>` runs `submit(e, clean)` from `useDraft`: `preventDefault()`, `setSaving(true)`, then `await onSave(clean(draft))`. `clean` trims text fields and drops blank source lines.

7. **`CollectionTab.handleSave` writes it.** `onSave` is `handleSave`. For an existing event the id stays the same (for a new one, `uniqueId` makes one from the title). It calls `updateTimeline(timeline.id, (t) => save(t, { ...item, id }))`, where `save` is `saveEvent` from [`mutations.ts`](../src/lib/mutations.ts). Inside a transaction, the current timeline is read, `saveEvent` returns a new timeline with this event replaced (and related links fixed on both sides), and it's written back.

8. **Marked clean.** `handleSave` calls `onDirtyChange(false)`, so the ref is `false` before anything else can navigate.

9. **The live query delivers the new timeline.** `TimelineGate`'s `useTimeline(id)` re-runs and returns the updated timeline. `EditorPage` re-renders, `events` is re-sorted (its dependency changed), the list shows the new title, and `EventForm` receives a new `original` that equals the draft. `dirty` becomes `false`, the "Unsaved changes" label disappears, and `setSaving(false)` re-enables the button.

10. **Elsewhere, for free.** If the viewer is open in another tab of the same browser, its live query fires too, and the node's title updates there.

## 27. Walkthrough D: clicking a place on the map

**In the viewer, with the map showing, you click the "Cadia" label.**

1. **The label's click handler runs.** The labels are `<button>`s inside drei's `<Html>`, rendered by `PlaceMarker` in [`GalaxyMap.tsx`](../src/components/map/GalaxyMap.tsx): `onClick={() => onSelect(place.id)}`. (Clicking the 3D sphere instead goes through r3f's raycast-based `onClick` on the mesh. Same result.)

2. **Up through props.** `PlaceMarker`'s `onSelect` calls `onSelectPlace?.(id)`. `GalaxyMap` was given `onSelectPlace={focusPlace}` by [`TimelineViewer.tsx`](../src/components/viewer/TimelineViewer.tsx).

3. **`focusPlace` updates two pieces of state:**

   ```tsx
   function focusPlace(placeId: string) {
     setFilters((f) => ({ ...f, placeId }));
     const first = events.find((e) => e.placeIds.includes(placeId));
     if (first) select(first.id);
   }
   ```

   React batches both updates into **one** re-render.

4. **Everything derived from the filters updates.** `isVisible` is a new function (its `filters` dependency changed), so `visible` is recalculated, so `status` becomes "1 / 5", and `erasWithEvents` shrinks, disabling eras with no Cadia events. `ViewerToolbar` gets the new filters and shows the "⌖ At Cadia ×" chip and "5 of 14 events". `TimelineTrack` re-renders each node with `dimmed={!isVisible(event)}`.

5. **The selection moves.** As in walkthrough B: the node highlights and scrolls into view, the info box swaps, and the URL updates.

6. **The map flies.** `mapFocus` is now `filters.placeId`, Cadia, so `GalaxyMap` gets `selectedPlaceId="cadia"`. Cadia's `PlaceMarker` re-renders with `selected={true}` (gold label, ring). `CameraRig` gets Cadia's position, so `focusKey` changes, and its effect calls `setLookAt` to glide the camera there.

7. **The arrows now stay at Cadia.** `neighbourOf` uses the new `isVisible`, so → and ← only visit the five Cadia events. The keyboard effect re-subscribed (its `step` and `visible` deps changed) with the new functions.

8. **Clicking × on the chip** calls `set({ placeId: null })` in the toolbar, then `onChange(filters)`, then `setFilters`, and everything above unwinds. `mapFocus` falls back to the selected event's first place.

One piece of state (`filters.placeId`) changed, and the toolbar, track, counter, era bar, info box and 3D camera all followed. None of them talk to each other directly. They all just render from the same state.

---

# Part 5: Practice

## 28. Exercises

Each one is small and touches a different idea. Do them on a branch, with `npm run dev` running. Create a timeline (or import one) and add a few events first, so there's something to look at.

1. **Read the props** *(components, props).* Add an "event count" badge to each era chip in the viewer's era bar, e.g. "The Horus Heresy (3)". Where do you get the count? (Hint: `visible` and `eraFor` are already in `TimelineViewer`.)
2. **Derived, not stored** *(state vs derived data).* Show "Showing events from 005.M31 to 999.M41" under the toolbar, using the first and last *visible* events. Resist adding `useState`.
3. **A new keyboard shortcut** *(effects, cleanup).* Make `/` focus the search box. You'll need a ref to the input in `ViewerToolbar`, a way to reach it from the viewer's key handler, and to remember `preventDefault()`. Then delete the effect's `return () => …` line, save a few times (hot reload re-runs effects), and press `/` to see why cleanups matter. Put it back.
4. **Break the functional update** *(state snapshots).* In `TimelineViewer`, change `step` back to `const t = neighbourOf(selectedId, direction); if (t) select(t.id);`. Hold down → and watch it stutter. Read the lint warning about dependencies, then undo.
5. **A new field end to end** *(data model, forms, mutations).* Add an optional `location?: string` text field to events ("Where, in words"). Change the type, add a `Field` to `EventForm`, include it in `clean`, and show it in `EventPanel`. Old timelines don't have it; make sure nothing breaks when it's `undefined`.
6. **A pure function, tested by hand** *(immutability).* In the browser console of the dev server, `import('/src/lib/mutations.ts')` and call `saveEvent` with a tiny fake timeline. Check the original object is unchanged afterwards and that related links went both ways.
7. **Use the generic component** *(generics).* Add a fifth editor tab, "Sources", that lists every distinct source string across all events (read-only, no form). Can you reuse `CollectionTab`? If not, why not, and what would you change?
8. **Make invalid numbers block Save** *(lifting state up).* Right now a red `NumberInput` still lets you save the last valid value. Add an `onValidityChange` prop, report it up through `DateInput` to `EventForm`, and include it in `valid`. Notice how far the information has to travel; would Context be worth it here?
9. **Animate the galaxy** *(r3f, `useFrame`).* Make the galaxy rotate slowly. Import `useFrame` from `@react-three/fiber`, give `GalaxyPoints` a ref to its `<points>`, and add `useFrame((_, delta) => { ref.current.rotation.y += delta * 0.02 })`. Then notice the problem: places don't rotate with it. Fix it by rotating a `<group>` that contains both.
10. **Read the build** *(code splitting).* Run `npm run build`. Then change the map import in `MapPage.tsx` to a normal `import GalaxyMap from '../components/map/GalaxyMap'` and build again. Compare the file sizes, then put it back.

## 29. Common mistakes and how to spot them

| Symptom | Likely cause | Fix |
|---|---|---|
| A `0` appears on the page | `{list.length && <X />}` with an empty list | `{list.length > 0 && <X />}` |
| The screen doesn't update after a change | You mutated an object or array (`push`, `obj.x = …`) | Build a new one: `[...arr, x]`, `{ ...obj, x }` |
| An input won't let you type | Controlled input (`value=`) with no `onChange`, or `onChange` that doesn't update the state behind `value` | Wire `onChange` to the state setter |
| A function runs once per render, or "Too many re-renders" | `onClick={doThing()}` calls it during render | `onClick={() => doThing()}` |
| Something happens twice in development | `StrictMode` running effects twice, and the cleanup is missing | Add or fix the effect's cleanup |
| An effect uses an old value | Missing dependency (stale closure) | Add it to the deps; read the lint warning |
| An effect runs on every render | A dependency is a new object or function each render | `useMemo`/`useCallback` it, or depend on a primitive (like `focusKey`) |
| An effect runs forever | It sets something that's in its own deps, with no guard | Add a condition (see the URL effect) |
| Rapid clicks or keys lose updates | New state computed from a render snapshot | Functional update: `setX(prev => …)` |
| A form shows the previous item's values | Same component instance reused for a different item | Give it `key={item.id}` |
| State attached to the wrong list item after reordering | Index used as `key` | Use a stable id |
| "Rendered more hooks than during the previous render" | A hook inside an `if`, loop, or after an early return | Move all hooks to the top |
| A `<button>` in a form saves the form | Buttons default to `type="submit"` | `type="button"` |
| `useThree` or `useFrame` throws | Called outside `<Canvas>` | Move that code into a component rendered inside the Canvas |
| The page is slow while typing | Expensive work recalculated every render | `useMemo` it, keyed on what it really depends on |

## 30. Glossary

| Term | Meaning |
|---|---|
| **Component** | A function that returns JSX describing part of the screen. |
| **JSX** | HTML-like syntax inside JavaScript, compiled to function calls. |
| **Render** | React calling your component to get its JSX. Not the same as the screen changing. |
| **Re-render** | Calling the component again because its state, props or context changed. |
| **Commit** | React applying the differences from a render to the real page. Effects run after this. |
| **Props** | A component's inputs, passed by its parent. Read-only. |
| **State** | Data a component remembers between renders; changing it causes a re-render. |
| **Derived data** | A value calculated from props or state during render, rather than stored. |
| **Hook** | A `use…` function that lets a component keep things between renders. |
| **Custom hook** | Your own `use…` function built from other hooks (`useDraft`, `usePref`). |
| **Effect** | Code that runs after a render to sync with something outside React (`useEffect`). |
| **Cleanup** | The function an effect returns; undoes the effect before it re-runs or on unmount. |
| **Dependencies** | The array telling an effect, memo or callback when to re-run. |
| **Stale closure** | A function still using values from an old render because it wasn't recreated. |
| **Ref** | A box (`useRef`) whose `.current` survives renders and doesn't trigger them. |
| **Controlled input** | An input whose value comes from state and reports changes with `onChange`. |
| **Key** | The identity React uses to match list items (and component instances) between renders. |
| **Mount / unmount** | A component appearing in, or being removed from, the tree. |
| **Lifting state up** | Moving state to the nearest common parent so siblings can share it. |
| **Render prop** | A prop (or `children`) that's a function returning JSX. |
| **Memoise** | Remember a computed result and reuse it while the inputs are unchanged. |
| **Suspense** | A boundary that shows a fallback while something below it is loading. |
| **Lazy component** | A component loaded from a separate file the first time it renders (`lazy`). |
| **Code splitting** | Splitting the app's JavaScript into files that load on demand. |
| **SPA** | Single-page app: one HTML page; the router swaps components as the URL changes. |
| **Live query** | A Dexie query that re-runs and re-renders when the data it read changes. |
| **Transaction** | A group of database reads and writes that happen as one unit. |
| **Pure function** | Same inputs, same output, no side effects. |
| **Structural sharing** | A new object reusing the unchanged parts of the old one. |
| **Raycasting** | Working out which 3D object is under the mouse by firing a line into the scene. |
| **HMR** | Hot module replacement: Vite swapping edited code into the running page. |

## 31. Where to read more

- **[react.dev/learn](https://react.dev/learn)**, the official React tutorial. Read "Describing the UI", "Adding Interactivity" and "Managing State" in order; this guide maps onto them closely.
- **[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)**, the single most useful page for avoiding React bugs.
- **[react.dev/reference/react](https://react.dev/reference/react)**, the API reference for every hook.
- **[reactrouter.com](https://reactrouter.com/)**: see "Data routers", `useSearchParams` and `useBlocker`.
- **[dexie.org/docs](https://dexie.org/docs/)**, including the `useLiveQuery` page.
- **[docs.pmnd.rs/react-three-fiber](https://docs.pmnd.rs/react-three-fiber)** and **[drei](https://github.com/pmndrs/drei)** for the 3D side; **[threejs.org/docs](https://threejs.org/docs/)** for the underlying objects.
- **[vite.dev](https://vite.dev/)** for the build tool.
- **[TypeScript handbook](https://www.typescriptlang.org/docs/handbook/intro.html)**, especially "Narrowing" and "Generics".

The best next step after this guide: pick an exercise from section 28, break something on purpose, and read the error message slowly. Most React errors say exactly what went wrong once you know the vocabulary in section 30.
