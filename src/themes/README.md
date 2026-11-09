# Themes

Each folder here is a theme. It's found automatically (see `index.ts`), so a
site built on Chronicle adds a theme by adding a folder, without touching
Chronicle's own files.

A theme folder has:

- `index.ts`: default-exports a `ThemeMeta` (`id`, `name`, optional
  `description` and `fontsUrl`) and imports the stylesheet.
- a stylesheet that scopes everything under `:root[data-theme='<id>']`.

Start by overriding the design tokens from the top of `src/index.css`
(`--bg`, `--surface`, `--text`, `--accent`, `--font-display`, …). Go further
with any selector, still scoped under the theme, e.g.
`:root[data-theme='<id>'] .event-panel { … }`.

A timeline picks its theme in **Edit → Settings**. The home page, and
timelines that don't pick one, use the site default (`VITE_DEFAULT_THEME`).
