import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders the headings and paragraphs a lesson uses', () => {
    const html = renderMarkdown('## The idea\n\nSome text.')
    expect(html).toContain('<h2>The idea</h2>')
    expect(html).toContain('<p>Some text.</p>')
  })

  it('renders lists', () => {
    const html = renderMarkdown('- one\n- two')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>one</li>')
  })

  it('renders fenced code with its language class', () => {
    const html = renderMarkdown('```rust\nfn main() {}\n```')
    expect(html).toContain('language-rust')
    expect(html).toContain('<pre>')
  })

  it('escapes raw HTML instead of injecting it', () => {
    const html = renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('leaves dashes alone, since the house style avoids them', () => {
    expect(renderMarkdown('a -- b')).toContain('a -- b')
  })
})
