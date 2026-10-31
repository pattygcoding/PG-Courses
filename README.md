# PG Courses

The course and lesson site for [pattygcoding.com](https://pattygcoding.com), published at
[courses.pattygcoding.com](https://courses.pattygcoding.com).

Short, project-driven courses on Rust, TypeScript, WebAssembly and the web. The site shares its
design language with [Arcade-PG-Website](https://github.com/pattygcoding/Arcade-PG-Website): a navy
canvas, a mint accent, Inter for text and JetBrains Mono for technical labels, with a light and
dark theme that flips on one attribute.

## Stack

- Vue 3 with `<script setup lang="ts">`
- TypeScript in strict mode
- Vite for the dev server and the production build
- Vue Router for client-side routing
- Tailwind CSS v3 with the shared design tokens in `src/styles.css`
- Vitest for unit tests

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
  components/        Shared UI: header, footer, theme toggle, course card
  composables/       useTheme, the light and dark theme store
  content/courses.ts The course catalogue the site renders from
  pages/             One component per route
  App.vue            Shell: header, routed view, footer
  router.ts          Route table and document titles
  site.ts            Site-wide constants and primary navigation
  styles.css         Design tokens and shared component classes
public/              CNAME, robots.txt, sitemap.xml, favicon, og image
scripts/copy-404.mjs Copies index.html to 404.html after the build
```

## Routes

| Path             | Page                                                    |
| ---------------- | ------------------------------------------------------- |
| `/`              | Home, with the hero, headline figures and the catalogue |
| `/courses`       | Every course, grouped by track                          |
| `/courses/:slug` | A course page with its lesson outline                   |
| `/about`         | What the courses are and how they are written           |
| anything else    | A 404 page that links back to the catalogue             |

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`. It installs dependencies, type checks,
runs the tests, builds, and publishes `dist/` to GitHub Pages.

Two files make the static host behave like an app:

- `public/CNAME` sets the custom domain to `courses.pattygcoding.com`. Create a `CNAME` DNS record
  pointing that host at `pattygcoding.github.io`, and set the custom domain in the repository's
  Pages settings.
- `scripts/copy-404.mjs` copies `index.html` to `404.html` after the build. GitHub Pages serves
  `404.html` for any path it cannot resolve on disk, so a hard refresh on `/courses/rust-foundations`
  boots the app and the router renders the right page.

## Adding a course or lesson

Courses and their lesson outlines live in `src/content/courses.ts`. Add a new entry to the
`courses` array and the catalogue, the home page and the routes pick it up.

Lesson bodies will be Markdown under `src/content/lessons/<course-slug>/<lesson-slug>.md`, using the
slugs already defined in the catalogue. **Before writing any lesson content, read
[AGENTS.md](./AGENTS.md)**. It lists the writing rules for this repository, including the patterns
to avoid.

## Licence

MIT. See [LICENSE](./LICENSE).
