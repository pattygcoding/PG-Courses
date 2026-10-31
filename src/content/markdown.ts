import MarkdownIt from 'markdown-it'

/**
 * One renderer for every page.  Two options are deliberate:
 *
 * - `html` stays off, so raw HTML in a lesson is escaped rather than injected.
 * - `typographer` stays off, because it would substitute en dashes and ellipses,
 *   and the house rules in AGENTS.md ban those.
 */
const renderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
})

/** Render a Markdown body to HTML for a page. */
export function renderMarkdown(source: string): string {
  return renderer.render(source)
}
