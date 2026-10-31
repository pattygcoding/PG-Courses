import { onBeforeUnmount, onMounted, type Ref } from 'vue'

const COPY_LABEL = 'Copy'
const COPIED_LABEL = 'Copied'
const FAILED_LABEL = 'Copy failed'
const RESET_MS = 1600

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
    button.textContent = copied ? COPIED_LABEL : FAILED_LABEL
    button.dataset.state = copied ? 'copied' : 'failed'

    clearTimeout(reset)
    reset = setTimeout(() => {
      button.textContent = COPY_LABEL
      delete button.dataset.state
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

  return { copyLabel: COPY_LABEL, copiedLabel: COPIED_LABEL, failedLabel: FAILED_LABEL }
}
