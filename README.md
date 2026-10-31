# PG Courses

The course site for [pattygcoding.com](https://pattygcoding.com), published at
[courses.pattygcoding.com](https://courses.pattygcoding.com).

Courses are written as Markdown files in this repository. The home page is the catalogue, grouped by
category, and each course opens with an intro page rendered from its own Markdown. The design is
shared with [Arcade-PG-Website](https://github.com/pattygcoding/Arcade-PG-Website): a navy canvas, a
mint accent, Inter for text and JetBrains Mono for technical labels, with a light and dark theme.

## Stack

- Vue 3 with `<script setup lang="ts">`
- TypeScript in strict mode
- Vite for the dev server and the production build
- Vue Router for client-side routing
- Tailwind CSS v3 with the design tokens in `src/styles.css`
- markdown-it for rendering course pages, js-yaml for their frontmatter
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
courses/                The courses themselves, one folder per course
  languages/python/intro.md
  frameworks/frontend/vue/intro.md
public/marks/           One SVG mark per course, named after the course slug
public/                 CNAME, robots.txt, sitemap.xml, favicon, og image
scripts/generate-pages.mjs Writes a page per course route plus 404.html after the build
src/components/         Header, footer, theme toggle, icon link, course card
src/composables/        useTheme, the light and dark theme store
src/content/courses.ts  Reads the courses/ tree into the catalogue
src/content/markdown.ts Renders a page body to HTML
src/pages/              Home (the catalogue), course, 404
src/router.ts           Routes and document titles
src/styles.css          Design tokens, `.prose` and shared component classes
```

## How the catalogue works

A course is a folder with an `intro.md` inside it:

```
courses/<category>/[<subcategory>/]<course>/intro.md
```

The folder names are the slugs, so a course's URL (`/courses/<course>/`), its mark
(`/marks/<course>.svg`) and its place in the catalogue all come from where the folder sits.

`src/content/courses.ts` globs every `intro.md`, parses the frontmatter with js-yaml, and builds the
tree the home page renders. Missing or mistyped fields throw, so a broken page fails the build
rather than showing up as a blank card.

## Routes

| Path              | Page                                               |
| ----------------- | -------------------------------------------------- |
| `/`               | The catalogue, grouped by category and subcategory |
| `/courses/:slug/` | A course's intro page, rendered from its Markdown  |
| anything else     | A 404 page that links back to the catalogue        |

## Adding a course

1. Create `courses/<category>/<course>/intro.md` (add a subcategory folder in the middle if the
   category needs one).
2. Write the frontmatter: `title`, `level`, `summary`, `labels`, `minutes`, `status`.
3. Use the standard sections: `## What this course is`, `## Who it is for`, `## What you will
build`, `## Prerequisites`, `## How the pages are ordered`.
4. Add a mark at `public/marks/<course>.svg`, drawn from plain shapes in the navy and mint palette.
5. Run `npm run typecheck && npm test`. The catalogue test fails if the mark is missing.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`. It installs dependencies, type checks,
runs the tests, builds, and publishes `dist/` to GitHub Pages.

Two files support the static host:

- `public/CNAME` sets the custom domain to `courses.pattygcoding.com`. Point a `CNAME` DNS record
  for that host at `pattygcoding.github.io`, and keep the custom domain set in the repository's
  Pages settings.
- `scripts/generate-pages.mjs` writes a copy of `index.html` into `dist/courses/<slug>/` for every
  course, and one to `404.html`. GitHub Pages serves a file per URL, so without those copies a
  refresh on `/courses/vue/` would show the host's own error page. That is also why course links end
  in a trailing slash: the URL then resolves to the generated file directly.

## Writing rules

**Before writing any course or lesson content, read [AGENTS.md](./AGENTS.md)**. It lists the
patterns to avoid in this repository, including em dashes, the "it is not X, it is Y" construction,
and emojis, with examples of what to write instead.

## Licence

MIT. See [LICENSE](./LICENSE).
