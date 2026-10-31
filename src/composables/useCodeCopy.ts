import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** What a screen reader is told, since the button itself shows only an icon. */
const COPIED_STATUS = 'Copied to the clipboard'
const FAILED_STATUS = 'Copy failed'
const RESET_MS = 1600

const STATUS: Record<'copied' | 'failed', string> = {
  copied: COPIED_STATUS,
  failed: FAILED_STATUS,
}

/**
 * Copy text to the clipboard.
 *
 * The async clipboard API needs a secure context, so a fallback keeps the button
 * working on an insecure origin such as a plain http host on a phone.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the older mechanism below.
  }

  try {
    const staging = document.createElement('textarea')
    staging.value = text
    staging.setAttribute('readonly', '')
    staging.style.position = 'fixed'
    staging.style.top = '-1000px'
    document.body.append(staging)
    staging.select()
    const copied = document.execCommand('copy')
    staging.remove()
    return copied
  } catch {
    return false
  }
}

/**
 * The icons are chosen by `data-state` in the stylesheet, so the handler sets the
 * state and the sentence a screen reader reads, and nothing else. The sentence
 * goes into the live region beside the button, so the button's own name stays
 * put while the feedback is announced.
 */
function setState(button: HTMLButtonElement, state: 'copied' | 'failed' | null): void {
  if (state) {
    button.dataset.state = state
  } else {
    delete button.dataset.state
  }

  const region = button.closest('.code-block')?.querySelector('[data-copy-status]')
  if (region instanceof HTMLElement) {
    region.textContent = state ? STATUS[state] : ''
  }
}

/**
 * Wire the copy buttons the Markdown renderer puts beside each code block.
 *
 * One listener on the container handles every button, so nothing has to be
 * attached when the rendered HTML is replaced, and the code is read from the
 * block at click time rather than stored in the markup.
 */
export function useCodeCopy(container: Ref<HTMLElement | null>) {
  let element: HTMLElement | null = null
  let reset: ReturnType<typeof setTimeout> | undefined

  async function onClick(event: MouseEvent): Promise<void> {
    const target = event.target
    const button = target instanceof HTMLElement ? target.closest('button[data-copy]') : null
    if (!(button instanceof HTMLButtonElement)) {
      return
    }

    const code = button.closest('.code-block')?.querySelector('pre code')?.textContent ?? ''
    if (code.length === 0) {
      return
    }

    const copied = await writeToClipboard(code)
    setState(button, copied ? 'copied' : 'failed')

    clearTimeout(reset)
    reset = setTimeout(() => {
      setState(button, null)
    }, RESET_MS)
  }

  onMounted(() => {
    element = container.value
    element?.addEventListener('click', onClick)
  })

  onBeforeUnmount(() => {
    element?.removeEventListener('click', onClick)
    clearTimeout(reset)
  })

  return { copiedStatus: COPIED_STATUS, failedStatus: FAILED_STATUS }
}
