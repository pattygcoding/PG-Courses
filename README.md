# PG Courses

The course and lesson site for [pattygcoding.com](https://pattygcoding.com), published at
[courses.pattygcoding.com](https://courses.pattygcoding.com).

Right now this is a blank landing page with the design in place: a navy canvas, a mint accent,
Inter for text and JetBrains Mono for technical labels, a light and dark theme, and the header and
footer shell. Course content comes later.

## Stack

- Vue 3 with `<script setup lang="ts">`
- TypeScript in strict mode
- Vite for the dev server and the production build
- Tailwind CSS v3 with the design tokens in `src/styles.css`
- Vitest and Vue Test Utils for unit tests

## Commands

| Command              | What it does                                             |
| -------------------- | -------------------------------------------------------- |
| `npm install`        | Install dependencies                                     |
| `npm run dev`        | Start the dev server at http://localhost:5173            |
| `npm run build`      | Type check, build to `dist/`, then write `dist/404.html` |
| `npm run preview`    | Serve the built site locally                             |
| `npm test`           | Run the unit tests once                                  |
| `npm run test:watch` | Run the unit tests in watch mode                         |
| `npm run typecheck`  | Type check without emitting                              |
| `npm run format`     | Format with Prettier                                     |

## Project layout

```
src/
  components/        Header, footer, theme toggle and the icon-link button
  composables/       useTheme, the light and dark theme store
  App.vue            Shell: header, the page body, footer
  main.ts            Mounts the app
  site.ts            Site-wide constants
  styles.css         Design tokens and shared component classes
public/              CNAME, robots.txt, sitemap.xml, favicon, og image
scripts/copy-404.mjs Copies index.html to 404.html after the build
```

The page body is the empty `<main>` in `src/App.vue`. That is where content goes.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`. It installs dependencies, type checks,
runs the tests, builds, and publishes `dist/` to GitHub Pages.

Two files support the static host:

- `public/CNAME` sets the custom domain to `courses.pattygcoding.com`. Point a `CNAME` DNS record
  for that host at `pattygcoding.github.io`, and keep the custom domain set in the repository's
  Pages settings.
- `scripts/copy-404.mjs` copies `index.html` to `404.html` after the build, so an unknown path still
  serves the app instead of the host's default error page.

## Writing rules

**Before writing any lesson or page copy, read [AGENTS.md](./AGENTS.md)**. It lists the patterns to
avoid in this repository, including em dashes, the "it is not X, it is Y" construction, and emojis.

## Licence

MIT. See [LICENSE](./LICENSE).
