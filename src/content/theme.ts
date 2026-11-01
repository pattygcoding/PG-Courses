/**
 * Per-course colour theme.
 *
 * A course's reading pages tint the accent, and the two code tokens that carry a
 * hue, to the brand colour of the course mark. A TypeScript lesson reads blue, a
 * Ruby lesson reads red, and the code blocks agree with the mark beside the title.
 *
 * The brand hex is the only value written by hand. Everything else is derived
 * from it and held to one contrast target on both the navy and the light
 * background, which is what stops a bright yellow or a deep purple from fading
 * into the page: the dark accent is the brand lifted until it reads on navy, and
 * the light accent is the brand deepened until it reads on white.
 */

/** `R G B` channels, the same shape the tokens in src/styles.css use. */
type Channels = readonly [number, number, number]

const WHITE: Channels = [255, 255, 255]
const BLACK: Channels = [0, 0, 0]

/** `--ink-950` from src/styles.css, the surface a lesson body sits on. */
const DARK_SURFACE: Channels = [5, 7, 12]
const LIGHT_SURFACE: Channels = [244, 246, 245]

/**
 * WCAG AA for body text. Links and inline accents are set in this colour, so
 * they clear the same bar rather than only the looser one for large text.
 */
const MIN_CONTRAST = 4.5

/**
 * Brand colour per course slug, taken from the mark at `public/marks/<slug>.svg`
 * and matching the colour its glyph is drawn in. `theme.spec.ts` reads each mark
 * back and fails when the hex is no longer there, so the two cannot drift apart.
 */
const BRANDS: Record<string, string> = {
  'agents-and-tool-use': '#F97316',
  'ai-assisted-testing': '#22C55E',
  'ai-code-review': '#4F46E5',
  'ai-security': '#EF4444',
  angular: '#DD0031',
  cline: '#38BDF8',
  csharp: '#9B4F96',
  css: '#2965F1',
  dotnet: '#512BD4',
  'embeddings-and-retrieval': '#14B8A6',
  express: '#9AA6B2',
  fastapi: '#05998B',
  'github-copilot': '#E6EBF0',
  go: '#00ADD8',
  html: '#E34F26',
  java: '#ED8B00',
  javascript: '#F7DF1E',
  'llm-foundations': '#A855F7',
  'local-models': '#A3E635',
  next: '#AEB7C2',
  'prompt-engineering': '#EAB308',
  python: '#4B8BBE',
  rails: '#CC0000',
  react: '#61DAFB',
  ruby: '#CC342D',
  rust: '#CE422B',
  'spring-boot': '#6DB33F',
  sql: '#5A9BC7',
  typescript: '#3178C6',
  vue: '#41B883',
}

/** Custom properties consumed by `.course-theme` in src/styles.css. */
export interface CourseThemeVars {
  '--course-accent': string
  '--course-accent-light': string
  '--course-string': string
  '--course-string-light': string
  '--course-number': string
  '--course-number-light': string
  /**
   * The index signature is what lets the object be bound with `:style`. Vue types
   * a style binding as CSSProperties, which carries the same signature for custom
   * properties, and a closed interface without one is rejected.
   */
  readonly [name: `--${string}`]: string | undefined
}

export interface CourseTheme {
  /** Brand hex of the course mark, kept so tests and tooling can read it. */
  readonly brand: string
  /** Bound on the page root, so the accent and code colours follow the course. */
  readonly vars: CourseThemeVars
}

/** Split `#rrggbb` into channels. Any other shape is a mistake in BRANDS. */
function fromHex(hex: string): Channels {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) {
    throw new Error(`"${hex}" is not a six digit hex colour`)
  }
  const value = match[1] as string
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

/** Relative luminance, as WCAG defines it. */
function luminance([r, g, b]: Channels): number {
  const linear = (channel: number): number => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** Contrast ratio between two colours, from 1 (identical) to 21 (black on white). */
function contrast(a: Channels, b: Channels): number {
  const first = luminance(a)
  const second = luminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

/** `from`, moved `weight` of the way to `to`, channel by channel. */
function blend(from: Channels, to: Channels, weight: number): Channels {
  return [
    Math.round(from[0] + (to[0] - from[0]) * weight),
    Math.round(from[1] + (to[1] - from[1]) * weight),
    Math.round(from[2] + (to[2] - from[2]) * weight),
  ]
}

/**
 * `colour`, moved toward `toward` until it reaches MIN_CONTRAST against
 * `background`. A colour that already passes is returned unchanged; the rest are
 * bisected, so the smallest change that clears the target wins.
 *
 * Moving toward white raises luminance and moving toward black lowers it, so
 * contrast against a fixed background rises the whole way and the bisection has
 * one answer either way.
 */
function readable(colour: Channels, toward: Channels, background: Channels): Channels {
  if (contrast(colour, background) >= MIN_CONTRAST) {
    return colour
  }

  let low = 0
  let high = 1
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2
    if (contrast(blend(colour, toward, mid), background) >= MIN_CONTRAST) {
      high = mid
    } else {
      low = mid
    }
  }
  return blend(colour, toward, high)
}

/** Channels as the space separated string a custom property expects. */
function channels(colour: Channels): string {
  return colour.join(' ')
}

/** The theme for a course, derived from the brand colour of its mark. */
export function themeFor(slug: string): CourseTheme {
  const brand = BRANDS[slug]
  if (!brand) {
    throw new Error(
      `The course "${slug}" has no brand colour. Add it to BRANDS in src/content/theme.ts.`,
    )
  }

  const base = fromHex(brand)
  const dark = readable(base, WHITE, DARK_SURFACE)
  const light = readable(base, BLACK, LIGHT_SURFACE)

  return {
    brand,
    vars: {
      // The accent is the brand; the two code tokens are lighter (dark theme) or
      // deeper (light theme) shades of it, so a block reads as shades of one hue.
      '--course-accent': channels(dark),
      '--course-accent-light': channels(light),
      '--course-string': channels(blend(dark, WHITE, 0.35)),
      '--course-string-light': channels(blend(light, BLACK, 0.3)),
      '--course-number': channels(blend(dark, WHITE, 0.6)),
      '--course-number-light': channels(blend(light, BLACK, 0.5)),
    },
  }
}
