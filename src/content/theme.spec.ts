import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { courses } from './courses'
import { themeFor } from './theme'

/** Relative luminance of an `R G B` token string, as WCAG defines it. */
function luminance(token: string): number {
  const linear = (channel: number): number => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = token.split(' ').map(Number) as [number, number, number]
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/**
 * Contrast between a token and a surface. Written out here rather than imported
 * from the module under test, so the check does not lean on its own maths.
 */
function contrast(token: string, surface: string): number {
  const first = luminance(token)
  const second = luminance(surface)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

/** `--ink-950` from src/styles.css, the surface a lesson body sits on. */
const DARK_SURFACE = '5 7 12'
const LIGHT_SURFACE = '244 246 245'

const MIN_CONTRAST = 4.5

function markFile(slug: string): string {
  return resolve(process.cwd(), 'public', 'marks', `${slug}.svg`)
}

describe('course theme', () => {
  it('gives every course a brand colour', () => {
    for (const course of courses) {
      expect(course.theme.brand, `${course.slug} brand`).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('takes the brand colour from the course mark', () => {
    for (const course of courses) {
      const svg = readFileSync(markFile(course.slug), 'utf8').toLowerCase()
      expect(svg, `${course.slug} mark should be drawn in ${course.theme.brand}`).toContain(
        course.theme.brand.toLowerCase(),
      )
    }
  })

  it('writes every value as an R G B triplet', () => {
    for (const course of courses) {
      for (const [name, value] of Object.entries(course.theme.vars)) {
        expect(value, `${course.slug} ${name}`).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/)
      }
    }
  })

  it('keeps every accent legible on the surface it is painted on', () => {
    for (const course of courses) {
      const dark = contrast(course.theme.vars['--course-accent'], DARK_SURFACE)
      const light = contrast(course.theme.vars['--course-accent-light'], LIGHT_SURFACE)
      expect(dark, `${course.slug} dark accent`).toBeGreaterThanOrEqual(MIN_CONTRAST)
      expect(light, `${course.slug} light accent`).toBeGreaterThanOrEqual(MIN_CONTRAST)
    }
  })

  it('keeps the two code tokens legible as well', () => {
    for (const course of courses) {
      const vars = course.theme.vars
      expect(
        contrast(vars['--course-string'], DARK_SURFACE),
        `${course.slug} string`,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST)
      expect(
        contrast(vars['--course-number'], DARK_SURFACE),
        `${course.slug} number`,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST)
      expect(
        contrast(vars['--course-string-light'], LIGHT_SURFACE),
        `${course.slug} light string`,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST)
      expect(
        contrast(vars['--course-number-light'], LIGHT_SURFACE),
        `${course.slug} light number`,
      ).toBeGreaterThanOrEqual(MIN_CONTRAST)
    }
  })

  it('refuses a course with no brand colour', () => {
    expect(() => themeFor('not-a-course')).toThrow(/no brand colour/)
  })
})
