import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MarkdownBody from './MarkdownBody.vue'

/** What the renderer emits for one highlighted block. */
const BLOCK =
  '<div class="code-block">' +
  '<button type="button" class="code-copy" data-copy aria-label="Copy this code to the clipboard">Copy</button>' +
  '<pre><code class="language-python"><span class="hljs-keyword">def</span> add():\n    <span class="hljs-keyword">return</span> 1</code></pre>' +
  '</div>'

/** Replace the clipboard with one that records the text it is handed. */
function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

describe('MarkdownBody', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the html it was given', () => {
    const wrapper = mount(MarkdownBody, { props: { html: BLOCK } })
    expect(wrapper.get('pre code').text()).toContain('add()')
  })

  it('copies the code from the block the button sits in', async () => {
    let copied = ''
    stubClipboard(async (text) => {
      copied = text
    })

    const wrapper = mount(MarkdownBody, { props: { html: BLOCK } })
    await wrapper.get('button[data-copy]').trigger('click')
    await flushPromises()

    expect(copied).toContain('def add():')
    expect(copied).not.toContain('<span')
  })

  it('confirms the copy, then goes back to the original label', async () => {
    vi.useFakeTimers()
    stubClipboard(async () => {})

    const wrapper = mount(MarkdownBody, { props: { html: BLOCK } })
    const button = wrapper.get('button[data-copy]')

    await button.trigger('click')
    await flushPromises()
    expect(button.text()).toBe('Copied')
    expect(button.attributes('data-state')).toBe('copied')

    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(button.text()).toBe('Copy')
    expect(button.attributes('data-state')).toBeUndefined()
  })

  it('says so when neither clipboard mechanism works', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')))
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true })

    const wrapper = mount(MarkdownBody, { props: { html: BLOCK } })
    const button = wrapper.get('button[data-copy]')

    await button.trigger('click')
    await flushPromises()

    expect(button.text()).toBe('Copy failed')
    expect(button.attributes('data-state')).toBe('failed')
  })
})
