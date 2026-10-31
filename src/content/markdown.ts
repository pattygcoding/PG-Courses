import MarkdownIt from 'markdown-it'

/**
 * One renderer for every page.  Three options are deliberate:
 *
 * - `html` stays off, so raw HTML in a page is escaped rather than injected.
 * - `typographer` stays off, because it would substitute en dashes and ellipses,
 *   and the house rules in AGENTS.md ban those.
 * - headings get an `id`, added in `renderPage` below, so a long lesson can offer
 *   an "on this page" list that links to its own sections.
 */
const renderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
})

export interface Heading {
  /** Depth of the heading, 2 or 3. */
  readonly level: number
  /** Anchor target, unique within the page. */
  readonly id: string
  readonly text: string
}

export interface RenderedPage {
  readonly html: string
  /** The headings a reader can jump to, in document order. */
  readonly headings: readonly Heading[]
}

/** Turn heading text into a URL fragment. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Render a Markdown body and report its `##` and `###` headings.
 *
 * The ids are assigned here rather than left to a plugin so the anchors and the
 * list that points at them are produced from the same pass, and duplicates are
 * numbered instead of silently colliding.
 */
export function renderPage(source: string): RenderedPage {
  const env: Record<string, unknown> = {}
  const tokens = renderer.parse(source, env)
  const headings: Heading[] = []
  const used = new Map<string, number>()

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type !== 'heading_open') {
      continue
    }

    const level = Number(token.tag.slice(1))
    if (level !== 2 && level !== 3) {
      continue
    }

    const text = tokens[index + 1]?.content ?? ''
    const base = slugify(text) || `section-${headings.length + 1}`
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)

    const id = seen === 0 ? base : `${base}-${seen + 1}`
    token.attrSet('id', id)
    headings.push({ level, id, text })
  }

  return { html: renderer.renderer.render(tokens, renderer.options, env), headings }
}
