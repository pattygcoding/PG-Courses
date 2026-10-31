import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { catalogue, courses, findCourse, findLesson } from './courses'
import { isHighlighted } from './highlight'

/** Resolve a public path such as "/marks/python.svg" against the project root. */
function publicFile(publicPath: string): string {
  return resolve(process.cwd(), 'public', publicPath.replace(/^\//, ''))
}

/** The folder a course lives in, rebuilt from its slugs. */
function courseFolder(course: {
  categorySlug: string
  subcategorySlug: string | null
  slug: string
}): string {
  return join(
    process.cwd(),
    'courses',
    course.categorySlug,
    ...(course.subcategorySlug ? [course.subcategorySlug] : []),
    course.slug,
  )
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

describe('lessons', () => {
  const withLessons = courses.filter((course) => course.lessons.length > 0)

  it('has at least one course with lessons', () => {
    expect(withLessons.length).toBeGreaterThan(0)
  })

  it('orders lessons by their filename number', () => {
    for (const course of withLessons) {
      const orders = course.lessons.map((lesson) => lesson.order)
      expect(orders, `${course.slug} order`).toEqual([...orders].sort((a, b) => a - b))
      expect(new Set(orders).size, `${course.slug} duplicate numbers`).toBe(orders.length)
    }
  })

  it('gives every lesson a unique slug and a route path built from it', () => {
    for (const course of withLessons) {
      const slugs = course.lessons.map((lesson) => lesson.slug)
      expect(new Set(slugs).size, `${course.slug} duplicate lesson slugs`).toBe(slugs.length)

      for (const lesson of course.lessons) {
        expect(lesson.path).toBe(`/courses/${course.slug}/${lesson.slug}/`)
      }
    }
  })

  it('reads the frontmatter and the body of every lesson', () => {
    for (const course of withLessons) {
      for (const lesson of course.lessons) {
        const where = `${course.slug}/${lesson.slug}`
        expect(lesson.title.length, `${where} title`).toBeGreaterThan(0)
        expect(lesson.summary.length, `${where} summary`).toBeGreaterThan(0)
        expect(lesson.chapter.length, `${where} chapter`).toBeGreaterThan(0)
        expect(lesson.minutes, `${where} minutes`).toBeGreaterThan(0)
        expect(lesson.body.length, `${where} body`).toBeGreaterThan(200)
        expect(lesson.body.startsWith('---'), `${where} keeps no frontmatter`).toBe(false)
      }
    }
  })

  it('groups lessons into chapters in the order the chapters first appear', () => {
    for (const course of withLessons) {
      const flattened = course.chapters.flatMap((chapter) => chapter.lessons)
      expect(flattened, `${course.slug} chapters`).toEqual([...course.lessons])

      const first = course.lessons[0]
      expect(course.chapters[0]?.name, `${course.slug} first chapter`).toBe(first?.chapter)
    }
  })

  it('sums the lesson reading time', () => {
    for (const course of withLessons) {
      const expected = course.lessons.reduce((total, lesson) => total + lesson.minutes, 0)
      expect(course.lessonMinutes, `${course.slug} lessonMinutes`).toBe(expected)
    }
  })

  it('loads every Markdown file that sits in a course folder', () => {
    for (const course of courses) {
      const folder = courseFolder(course)
      const files = readdirSync(folder).filter((name) => name.endsWith('.md'))

      expect(files, `${course.slug} intro`).toContain('intro.md')
      expect(files.length, `${course.slug} files on disk`).toBe(course.lessons.length + 1)
    }
  })

  it('fences only languages the highlighter knows, apart from plain output', () => {
    const fence = /^```([\w+#.-]+)/gm

    const pages: [string, string][] = [
      ...courses.map((course) => [`${course.slug}/intro`, course.body] as [string, string]),
      ...courses.flatMap((course) =>
        course.lessons.map(
          (lesson) => [`${course.slug}/${lesson.slug}`, lesson.body] as [string, string],
        ),
      ),
    ]

    for (const [where, body] of pages) {
      for (const match of body.matchAll(fence)) {
        const language = match[1] as string
        const known = isHighlighted(language) || language === 'text'
        expect(
          known,
          `${where} fences "${language}", which is not registered in src/content/highlight.ts`,
        ).toBe(true)
      }
    }
  })

  it('finds a lesson inside a course', () => {
    const course = withLessons[0]
    const lesson = course?.lessons[0]
    expect(lesson).toBeDefined()
    expect(findLesson(course!.slug, lesson!.slug)).toBe(lesson)
  })

  it('returns undefined for an unknown lesson or course', () => {
    expect(findLesson('python', 'does-not-exist')).toBeUndefined()
    expect(findLesson('does-not-exist', 'anything')).toBeUndefined()
  })
})
