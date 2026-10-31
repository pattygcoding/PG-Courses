import { readonly, ref } from 'vue'

export type Theme = 'light' | 'dark'

/** Persisted key, shared with the pre-paint script in index.html. */
const STORAGE_KEY = 'pg-courses-theme'
const ATTRIBUTE = 'data-theme'

/**
 * Work out the theme to start with.  This mirrors index.html's pre-paint script
 * exactly (stored choice first, then the OS preference), so the value the app
 * reports matches the palette already painted on <html>.
 */
function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // Storage can be unavailable (private mode); fall through to the OS setting.
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function apply(theme: Theme): void {
  document.documentElement.setAttribute(ATTRIBUTE, theme)
}

// Module level, so every component shares one value and one stored preference
// rather than each holding its own copy.
const current = ref<Theme>(readInitialTheme())
apply(current.value)

/**
 * Read and change the active colour theme.  The initial value is applied on
 * import, which is why the app never has to run a boot step of its own.
 */
export function useTheme() {
  function set(theme: Theme): void {
    current.value = theme
    apply(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // The theme still applies for this session even if it cannot be stored.
    }
  }

  function toggle(): void {
    set(current.value === 'dark' ? 'light' : 'dark')
  }

  return { theme: readonly(current), set, toggle }
}
