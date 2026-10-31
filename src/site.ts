/**
 * Site-wide constants.  Anything that would otherwise be copy-pasted across
 * components (URLs, the app name) lives here so there is one place to change it.
 */

export const site = {
  name: 'Patrick Goodwin Courses',
  brand: 'PG / Courses',
  /** Canonical origin.  Used for titles and meta tags. */
  url: 'https://courses.pattygcoding.com',
  description:
    'Short, project-driven courses on Rust, TypeScript, WebAssembly and the web, written by Patrick Goodwin.',
  author: 'Patrick Goodwin',
  /** Escape hatch back to the portfolio, mirroring the Arcade site. */
  portfolioUrl: 'https://pattygcoding.com',
  repoUrl: 'https://github.com/pattygcoding/PG-Courses',
} as const
