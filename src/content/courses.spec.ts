import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalogue, courses, findCourse } from './courses'

/** Resolve a public path such as "/marks/python.svg" against the project root. */
function publicFile(publicPath: string): string {
  return resolve(process.cwd(), 'public', publicPath.replace(/^\//, ''))
}

describe('course catalogue', () => {
  it('finds a course for every intro file under courses/', () => {
    expect(courses.length).toBeGreaterThan(0)
  })

  it('derives the category and subcategory from the folder path', () => {
    const python = findCourse('python')
    expect(python?.category).toBe('Languages')
    expect(python?.subcategory).toBeNull()

    const vue = findCourse('vue')
    expect(vue?.category).toBe('Frameworks')
    expect(vue?.subcategory).toBe('Frontend')
  })

  it('uses a unique slug for every course', () => {
    const slugs = courses.map((course) => course.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('reads the frontmatter and the body of every intro page', () => {
    for (const course of courses) {
      expect(course.title.length, `${course.slug} title`).toBeGreaterThan(0)
      expect(course.summary.length, `${course.slug} summary`).toBeGreaterThan(0)
      expect(course.labels.length, `${course.slug} labels`).toBeGreaterThan(0)
      expect(course.minutes, `${course.slug} minutes`).toBeGreaterThan(0)
      expect(course.body.length, `${course.slug} body`).toBeGreaterThan(200)
      expect(course.body.startsWith('---'), `${course.slug} body keeps no frontmatter`).toBe(false)
    }
  })

  it('orders the catalogue by the configured category and subcategory lists', () => {
    expect(catalogue.map((category) => category.name)).toEqual(['Languages', 'Frameworks'])

    const languages = catalogue.find((category) => category.slug === 'languages')
    expect(languages?.groups).toHaveLength(1)
    expect(languages?.groups[0]?.name).toBeNull()

    const frameworks = catalogue.find((category) => category.slug === 'frameworks')
    expect(frameworks?.groups.map((group) => group.name)).toEqual(['Frontend', 'Backend'])
  })

  it('holds every course in exactly one group', () => {
    const grouped = catalogue.flatMap((category) =>
      category.groups.flatMap((group) => group.courses.map((course) => course.slug)),
    )
    expect(grouped.slice().sort()).toEqual(courses.map((course) => course.slug).sort())
  })

  it('points every course at a mark that exists and is an SVG', () => {
    for (const course of courses) {
      expect(course.mark, `${course.slug} mark`).toBe(`/marks/${course.slug}.svg`)

      const file = publicFile(course.mark)
      expect(existsSync(file), `${course.mark} is missing from public/marks`).toBe(true)
      expect(readFileSync(file, 'utf8').trimStart().startsWith('<svg')).toBe(true)
    }
  })

  it('returns undefined for an unknown slug', () => {
    expect(findCourse('does-not-exist')).toBeUndefined()
  })
})
