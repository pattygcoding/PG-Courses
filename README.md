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
- highlight.js for code colouring, with only the languages the courses use registered
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
  languages/python/01-how-python-runs.md
  frameworks/frontend/vue/intro.md
public/marks/           One SVG mark per course, named after the course slug
public/                 CNAME, robots.txt, favicon, og image
scripts/generate-pages.mjs Writes a page per route and generates the sitemap
src/components/         Header, footer, theme toggle, icon link, course card, MarkdownBody
src/composables/        useTheme, useCodeCopy
src/content/courses.ts  Reads the courses/ tree into the catalogue and contents lists
src/content/highlight.ts Registers the languages a lesson may fence
src/content/markdown.ts Renders a page body to highlighted HTML, with its headings
src/pages/              Home (the catalogue), course, lesson, 404
src/router.ts           Routes and document titles
src/styles.css          Design tokens, `.prose`, code blocks and the syntax colours
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

Display order is explicit. `CATEGORY_ORDER` and `SUBCATEGORY_ORDER` in the same file decide which
category and subcategory comes first, so a folder can be named for its slug without that name
deciding where it appears. Anything not listed keeps alphabetical order after the listed names, so
adding a folder needs no change there unless it has to sit in a particular place.

Course scope is deliberate. A language course covers the language and its standard library, and a
framework course covers the runtime, the framework and hosting. C# and .NET are two courses for that
reason, and Java and Spring Boot are another pair. The same split applies whenever a language ships a
platform of its own.

## How lessons work

A lesson is a numbered Markdown file sitting beside the intro:

```text
courses/<category>/[<subcategory>/]<course>/<number>-<slug>.md
```

The number sets the reading order and the rest of the filename is the slug, so `07-strings-and-bytes.md`
becomes `/courses/python/strings-and-bytes/`. Renaming a file to move it in the order never changes its
URL.

Lesson frontmatter is `title`, `summary`, `chapter`, `minutes` and `status`. The `chapter` groups lessons
in the contents list, and chapters appear in the order their first lesson appears, so a new chapter needs
no registration anywhere.

Every course page renders a contents list from those files. Each lesson page gets an "on this page" list
built from its own `##` and `###` headings, and previous and next links, so a reader can move through a
long course without going back to the contents.

Code blocks are coloured with highlight.js and each one carries a copy button, so a snippet can be
pasted into a terminal without selecting it. The languages are registered by hand in
`src/content/highlight.ts`, which keeps the bundle to the languages the courses actually use.

## Routes

| Path                        | Page                                               |
| --------------------------- | -------------------------------------------------- |
| `/`                         | The catalogue, grouped by category and subcategory |
| `/courses/:course/`         | A course's intro page and its contents list        |
| `/courses/:course/:lesson/` | A lesson, rendered from its Markdown               |
| anything else               | A 404 page that links back to the catalogue        |

## Adding a course

1. Create `courses/<category>/<course>/intro.md` (add a subcategory folder in the middle if the
   category needs one).
2. Write the frontmatter: `title`, `level`, `summary`, `labels`, `minutes`, `status`.
3. Use the standard sections: `## What this course is`, `## Who it is for`, `## What you will
build`, `## Prerequisites`, `## How the pages are ordered`.
4. Add a mark at `public/marks/<course>.svg`, drawn from plain shapes in the navy and mint palette.
5. Run `npm run typecheck && npm test`. The catalogue test fails if the mark is missing.

## Adding a lesson

1. Create `courses/<category>/<course>/<number>-<slug>.md`, using the next number for its place in
   the reading order.
2. Write the frontmatter: `title`, `summary`, `chapter`, `minutes`, `status`.
3. Start the body at `##` and end it with `## Check yourself`.
4. Register any new fence language in `src/content/highlight.ts`. The test suite fails and names the
   language if you forget.
5. Run `npm run typecheck && npm test`. The lesson tests check the numbering, the chapters, the slugs
   and that every Markdown file on disk was loaded.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`. It installs dependencies, type checks,
runs the tests, builds, and publishes `dist/` to GitHub Pages.

Two files support the static host:

- `public/CNAME` sets the custom domain to `courses.pattygcoding.com`. Point a `CNAME` DNS record
  for that host at `pattygcoding.github.io`, and keep the custom domain set in the repository's
  Pages settings.
- `scripts/generate-pages.mjs` walks the course tree and writes a copy of `index.html` into
  `dist/courses/<course>/` and `dist/courses/<course>/<lesson>/` for every page, plus one to
  `404.html`. GitHub Pages serves a file per URL, so without those copies a refresh on
  `/courses/vue/` would show the host's own error page. That is also why links end in a trailing
  slash: the URL resolves to the generated file directly. The same script generates `sitemap.xml`
  from the routes it just wrote, so a new lesson cannot leave a stale entry behind.

## Writing rules

**Before writing any course or lesson content, read [AGENTS.md](./AGENTS.md)**. It lists the
patterns to avoid in this repository, including em dashes, the "it is not X, it is Y" construction,
and emojis, with examples of what to write instead.

## Licence

MIT. See [LICENSE](./LICENSE).
