import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MarkdownBody from './MarkdownBody.vue'
import { renderPage } from '../content/markdown'

/**
 * What the renderer emits for one highlighted block. Taken from the renderer
 * rather than written out, so the fixture cannot drift from the markup the
 * component actually receives.
 */
const BLOCK = renderPage(['```python', 'def add():', '    return 1', '```'].join('\n')).html

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

  it('shows an icon and no words of its own', () => {
    const wrapper = mount(MarkdownBody, { props: { html: BLOCK } })
    const button = wrapper.get('button[data-copy]')

    expect(button.findAll('svg')).toHaveLength(3)
    expect(button.findAll('svg[aria-hidden="true"]')).toHaveLength(3)
    expect(button.text()).toBe('')
    expect(button.attributes('aria-label')).toBe('Copy this code to the clipboard')
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

  it('switches to the copied state, announces it, then goes back', async () => {
    vi.useFakeTimers()
    stubClipboard(async () => {})

    const wrapper = mount(MarkdownBody, { props: { html: BLOCK } })
    const button = wrapper.get('button[data-copy]')

    await button.trigger('click')
    await flushPromises()
    expect(button.attributes('data-state')).toBe('copied')
    expect(wrapper.get('[data-copy-status]').text()).toBe('Copied to the clipboard')

    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(button.attributes('data-state')).toBeUndefined()
    expect(wrapper.get('[data-copy-status]').text()).toBe('')
  })

  it('switches to the failed state when neither clipboard mechanism works', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')))
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true })

    const wrapper = mount(MarkdownBody, { props: { html: BLOCK } })
    const button = wrapper.get('button[data-copy]')

    await button.trigger('click')
    await flushPromises()

    expect(button.attributes('data-state')).toBe('failed')
    expect(wrapper.get('[data-copy-status]').text()).toBe('Copy failed')
  })
})
