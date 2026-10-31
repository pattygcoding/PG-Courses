import { describe, expect, it } from 'vitest'
import { renderPage } from './markdown'

describe('renderPage', () => {
  it('renders the headings and paragraphs a lesson uses', () => {
    const { html } = renderPage('## The idea\n\nSome text.')
    expect(html).toContain('<h2 id="the-idea">The idea</h2>')
    expect(html).toContain('<p>Some text.</p>')
  })

  it('reports the headings a reader can jump to, and skips deeper ones', () => {
    const { headings } = renderPage('## One\n\n### Two\n\n#### Too deep')
    expect(headings).toEqual([
      { level: 2, id: 'one', text: 'One' },
      { level: 3, id: 'two', text: 'Two' },
    ])
  })

  it('numbers repeated headings instead of colliding', () => {
    const { headings } = renderPage('## Notes\n\n## Notes\n\n## Notes')
    expect(headings.map((heading) => heading.id)).toEqual(['notes', 'notes-2', 'notes-3'])
  })

  it('reports heading text without emphasis markers or backticks', () => {
    const { headings } = renderPage(
      '## A class attribute with **get** controls lookup\n\n## `__name__` and friends',
    )

    expect(headings.map((heading) => heading.text)).toEqual([
      'A class attribute with get controls lookup',
      '__name__ and friends',
    ])
    expect(headings[0]?.id).toBe('a-class-attribute-with-get-controls-lookup')
  })

  it('turns punctuation into single hyphens in an anchor', () => {
    const { headings } = renderPage('## try / except / finally')
    expect(headings[0]?.id).toBe('try-except-finally')
  })

  it('renders lists and fenced code with its language', () => {
    const { html } = renderPage('- one\n\n```rust\nfn main() {}\n```')
    expect(html).toContain('<li>one</li>')
    expect(html).toContain('language-rust')
  })

  it('escapes raw HTML instead of injecting it', () => {
    const { html } = renderPage('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('leaves dashes alone, since the house style avoids them', () => {
    expect(renderPage('a -- b').html).toContain('a -- b')
  })
})
