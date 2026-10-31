import MarkdownIt from 'markdown-it'
import { highlightCode } from './highlight'

/**
 * One renderer for every page.  Four things are deliberate:
 *
 * - `html` stays off, so raw HTML in a page is escaped rather than injected.
 * - `typographer` stays off, because it would substitute en dashes and ellipses,
 *   and the house rules in AGENTS.md ban those.
 * - `highlight` colours every fenced block, and a language nobody registered
 *   falls back to plain text instead of failing.
 * - fenced blocks are wrapped, so a copy button can sit beside the block rather
 *   than inside the area that scrolls sideways.
 */
const renderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  highlight: (code, language) => highlightCode(code, language),
})

/**
 * One icon sprite, at the size and stroke weight the rest of the site's icons
 * use. Each copy button carries all three inline rather than pointing at a
 * shared `<symbol>`, because four short paths repeated per page compress to
 * nothing and a `<use>` reference that fails shows an empty button.
 */
function sprite(variant: string, shape: string): string {
  return (
    `<svg class="code-copy-icon ${variant}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" ` +
    `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`
  )
}

/** Which sprite shows is decided by `data-state` in the stylesheet. */
const COPY_ICONS =
  sprite(
    'code-copy-icon-copy',
    '<rect x="9" y="9" width="13" height="13" rx="2" />' +
      '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />',
  ) +
  sprite('code-copy-icon-done', '<path d="M20 6 9 17l-5-5" />') +
  sprite('code-copy-icon-failed', '<path d="M18 6 6 18M6 6l12 12" />')

/**
 * The button the copy handler in `useCodeCopy` looks for. It carries no code of
 * its own: the handler reads the text from the block it sits in, so nothing is
 * duplicated into an attribute.
 *
 * The button shows an icon and no words, so its accessible name comes from
 * `aria-label` and the outcome goes into a live region beside it. Putting the
 * sentence in the button would work visually and rename the control mid-click,
 * which a screen reader treats as a different button.
 */
const COPY_BUTTON =
  '<button type="button" class="code-copy" data-copy aria-label="Copy this code to the clipboard">' +
  COPY_ICONS +
  '</button>' +
  '<span class="sr-only" data-copy-status aria-live="polite"></span>'

const rules = renderer.renderer.rules
const baseFence = rules.fence
const baseCodeBlock = rules.code_block

rules.fence = (tokens, index, options, env, self) => {
  const body = baseFence ? baseFence(tokens, index, options, env, self) : ''
  return `<div class="code-block">${COPY_BUTTON}${body}</div>\n`
}

rules.code_block = (tokens, index, options, env, self) => {
  const body = baseCodeBlock ? baseCodeBlock(tokens, index, options, env, self) : ''
  return `<div class="code-block">${COPY_BUTTON}${body}</div>\n`
}

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

/** The parts of an inline token this module needs. */
interface InlineToken {
  readonly content: string
  readonly children?: readonly { readonly type: string; readonly content: string }[] | null
}

/** Plain text of a heading, with the emphasis markers and backticks removed. */
function headingText(token: InlineToken | undefined): string {
  if (!token) {
    return ''
  }

  const children = token.children ?? []
  if (children.length === 0) {
    return token.content
  }

  return children
    .filter((child) => child.type === 'text' || child.type === 'code_inline')
    .map((child) => child.content)
    .join('')
}

/**
 * Render a Markdown body and report its `##` and `###` headings.
 *
 * The ids are assigned here rather than left to a plugin, so the anchors and the
 * list that points at them come from the same pass and duplicates are numbered
 * instead of silently colliding. Heading text is taken from the parsed children,
 * so a heading written with `**bold**` or a backticked name reads cleanly in the
 * contents entry.
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

    const text = headingText(tokens[index + 1])
    const base = slugify(text) || `section-${headings.length + 1}`
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)

    const id = seen === 0 ? base : `${base}-${seen + 1}`
    token.attrSet('id', id)
    headings.push({ level, id, text })
  }

  return { html: renderer.renderer.render(tokens, renderer.options, env), headings }
}
