import { beforeEach, describe, expect, it } from 'vitest'
import { useTheme } from './useTheme'

const STORAGE_KEY = 'pg-courses-theme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('writes the theme onto the html element', () => {
    useTheme().set('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('stores the chosen theme so the next visit agrees', () => {
    useTheme().set('dark')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('toggles between light and dark', () => {
    const { theme, set, toggle } = useTheme()

    set('dark')
    toggle()
    expect(theme.value).toBe('light')

    toggle()
    expect(theme.value).toBe('dark')
  })

  it('shares one value across callers', () => {
    useTheme().set('light')
    expect(useTheme().theme.value).toBe('light')
  })
})
