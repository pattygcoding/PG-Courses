import { load } from 'js-yaml'
import { themeFor, type CourseTheme } from './theme'

/**
 * The course catalogue, derived from the folder tree under `courses/`.
 *
 * A course is a folder holding an `intro.md`, at one of two depths:
 *
 *   courses/<category>/<course>/intro.md
 *   courses/<category>/<subcategory>/<course>/intro.md
 *
 * Lesson pages sit beside the intro, named `<number>-<slug>.md`, for example
 * `07-strings-and-bytes.md`. The number sets the reading order and the rest of
 * the filename is the slug, so renaming a file to reorder it never changes its
 * URL.
 *
 * The folder and file names are the slugs, so a page's URL, its mark and its
 * place in the catalogue all come from where it sits. Only the prose fields live
 * in the frontmatter, which keeps the two from drifting apart.
 */

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced'

/** `draft` pages are written, `planned` pages are outlined only. */
export type LessonStatus = 'draft' | 'planned'

export interface Lesson {
  /** Filename after the number, used in the URL as /courses/<course>/<slug>/. */
  readonly slug: string
  readonly title: string
  readonly summary: string
  /** Section of the contents list this lesson sits in. */
  readonly chapter: string
  /** Reading time for this page, in minutes. */
  readonly minutes: number
  readonly status: LessonStatus
  /** Position taken from the filename prefix, used for ordering. */
  readonly order: number
  /** Route path, for example /courses/python/strings-and-bytes/. */
  readonly path: string
  readonly body: string
}

/** A run of lessons under one heading in the contents list. */
export interface LessonChapter {
  readonly name: string
  readonly lessons: readonly Lesson[]
}

export interface Course {
  /** Folder name, used in the URL as /courses/:course/. */
  readonly slug: string
  readonly title: string
  /** Display name of the top level category, for example "Languages". */
  readonly category: string
  readonly categorySlug: string
  /** Display name of the middle folder, or null when a course sits under a category directly. */
  readonly subcategory: string | null
  readonly subcategorySlug: string | null
  readonly level: CourseLevel
  readonly summary: string
  /** Short tags shown on the card, for example "Frontend" or "Automation". */
  readonly labels: readonly string[]
  /** Reading time for the intro page, in minutes. */
  readonly minutes: number
  readonly status: LessonStatus
  /** Public path of the course mark, derived from the slug. */
  readonly mark: string
  /** Accent and code colours for this course's pages, taken from its mark. */
  readonly theme: CourseTheme
  /** Markdown body of the course's first page. */
  readonly body: string
  /** Every lesson, in reading order. */
  readonly lessons: readonly Lesson[]
  /** The contents list, grouped into chapters in the order they first appear. */
  readonly chapters: readonly LessonChapter[]
  /** Total reading time across the lessons, in minutes. */
  readonly lessonMinutes: number
}

/** One leaf of the catalogue: a subcategory, or the whole category when it has none. */
export interface CourseGroup {
  readonly slug: string | null
  readonly name: string | null
  readonly courses: readonly Course[]
}

export interface CourseCategory {
  readonly slug: string
  readonly name: string
  readonly groups: readonly CourseGroup[]
}

interface CourseFrontmatter {
  readonly title: string
  readonly level: CourseLevel
  readonly summary: string
  readonly labels: readonly string[]
  readonly minutes: number
  readonly status: LessonStatus
}

interface LessonFrontmatter {
  readonly title: string
  readonly summary: string
  readonly chapter: string
  readonly minutes: number
  readonly status: LessonStatus
}

const LEVELS: readonly CourseLevel[] = ['Beginner', 'Intermediate', 'Advanced']
const STATUSES: readonly LessonStatus[] = ['draft', 'planned']

/** Human names for the top level folders. Anything unlisted is title cased. */
const CATEGORY_NAMES: Record<string, string> = {
  languages: 'Languages',
  frameworks: 'Frameworks',
  ai: 'AI',
}

/** Human names for the middle folders. */
const SUBCATEGORY_NAMES: Record<string, string> = {
  backend: 'Backend',
  frontend: 'Frontend',
}

/**
 * Display order for the catalogue. Ordering is explicit so a folder can be named
 * for its slug without that name deciding where it appears. Anything not listed
 * keeps alphabetical order, after the listed names, so adding a folder needs no
 * change here unless it has to sit in a particular place.
 */
const CATEGORY_ORDER: readonly string[] = ['languages', 'frameworks', 'ai']
const SUBCATEGORY_ORDER: readonly string[] = ['frontend', 'backend', 'fullstack']

/** Lesson filenames: a number for ordering, then the slug. */
const LESSON_FILE = /^(\d+)-(.+)\.md$/

/** Position of a slug in an explicit order, with unlisted slugs sorting last. */
function rank(slug: string, order: readonly string[]): number {
  const index = order.indexOf(slug)
  return index === -1 ? order.length : index
}

/** Order two slugs by an explicit list first, then alphabetically. */
function compareWithOrder(a: string, b: string, order: readonly string[]): number {
  const byRank = rank(a, order) - rank(b, order)
  return byRank === 0 ? a.localeCompare(b) : byRank
}

function fail(file: string, message: string): never {
  throw new Error(`${file}: ${message}`)
}

function displayName(slug: string, names: Record<string, string>): string {
  return names[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1)
}

function requireString(file: string, source: Record<string, unknown>, key: string): string {
  const value = source[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(file, `frontmatter "${key}" must be a non-empty string`)
  }
  return value
}

function requireNumber(file: string, source: Record<string, unknown>, key: string): number {
  const value = source[key]
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    fail(file, `frontmatter "${key}" must be a positive number`)
  }
  return value
}

function requireStringList(file: string, source: Record<string, unknown>, key: string): string[] {
  const value = source[key]
  if (!Array.isArray(value)) {
    fail(file, `frontmatter "${key}" must be a list of strings`)
  }
  const items = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  )
  if (items.length !== value.length) {
    fail(file, `frontmatter "${key}" must only contain non-empty strings`)
  }
  return items
}

function requireChoice<T extends string>(
  file: string,
  source: Record<string, unknown>,
  key: string,
  choices: readonly T[],
): T {
  const value = source[key]
  if (typeof value !== 'string' || !choices.includes(value as T)) {
    fail(file, `frontmatter "${key}" must be one of: ${choices.join(', ')}`)
  }
  return value as T
}

/** Split a page into its frontmatter mapping and its Markdown body. */
function readFrontmatter(
  file: string,
  raw: string,
): { source: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) {
    fail(file, 'is missing its frontmatter block')
  }

  const parsed: unknown = load(match[1])
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail(file, 'frontmatter must be a mapping of keys to values')
  }

  return {
    source: parsed as Record<string, unknown>,
    body: raw.slice(match[0].length).trim(),
  }
}

function readCourseFrontmatter(
  file: string,
  raw: string,
): { data: CourseFrontmatter; body: string } {
  const { source, body } = readFrontmatter(file, raw)
  return {
    data: {
      title: requireString(file, source, 'title'),
      level: requireChoice(file, source, 'level', LEVELS),
      summary: requireString(file, source, 'summary'),
      labels: requireStringList(file, source, 'labels'),
      minutes: requireNumber(file, source, 'minutes'),
      status: requireChoice(file, source, 'status', STATUSES),
    },
    body,
  }
}

function readLessonFrontmatter(
  file: string,
  raw: string,
): { data: LessonFrontmatter; body: string } {
  const { source, body } = readFrontmatter(file, raw)
  return {
    data: {
      title: requireString(file, source, 'title'),
      summary: requireString(file, source, 'summary'),
      chapter: requireString(file, source, 'chapter'),
      minutes: requireNumber(file, source, 'minutes'),
      status: requireChoice(file, source, 'status', STATUSES),
    },
    body,
  }
}

/**
 * Every Markdown file under courses/, keyed by its path.
 *
 * Eager, so the contents list and a lesson body are both available on first
 * render, with no request per page and no loading state to handle.
 *
 * The trade-off is size: the lesson bodies ride along in this module's chunk,
 * which the catalogue route also imports. At the current size that is tens of
 * kilobytes compressed. Once the site holds several hundred lessons, split the
 * bodies into a lazily loaded glob and generate a metadata manifest, so the
 * catalogue only ships titles and counts.
 */
const pageFiles = import.meta.glob('/courses/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Split the globbed files into one bucket per course folder. */
function groupByFolder(files: Record<string, string>): Map<string, Map<string, string>> {
  const byFolder = new Map<string, Map<string, string>>()

  for (const [path, raw] of Object.entries(files)) {
    const segments = path.split('/').filter((segment) => segment.length > 0)
    const name = segments[segments.length - 1] as string
    const folder = segments.slice(0, -1).join('/')
    const bucket = byFolder.get(folder) ?? new Map<string, string>()
    bucket.set(name, raw)
    byFolder.set(folder, bucket)
  }

  return byFolder
}

function parseLesson(file: string, name: string, raw: string, courseSlug: string): Lesson {
  const match = LESSON_FILE.exec(name)
  if (!match) {
    fail(file, 'lesson files must be named <number>-<slug>.md, for example 07-strings.md')
  }

  const { data, body } = readLessonFrontmatter(file, raw)
  const slug = match[2] as string

  return {
    slug,
    title: data.title,
    summary: data.summary,
    chapter: data.chapter,
    minutes: data.minutes,
    status: data.status,
    order: Number(match[1]),
    path: `/courses/${courseSlug}/${slug}/`,
    body,
  }
}

/** Read every lesson in a course folder and put them in reading order. */
function orderLessons(folder: string, files: Map<string, string>, courseSlug: string): Lesson[] {
  const lessons = [...files.entries()]
    .filter(([name]) => name !== 'intro.md')
    .map(([name, raw]) => parseLesson(`${folder}/${name}`, name, raw, courseSlug))
    .sort((a, b) => a.order - b.order)

  const seen = new Set<number>()
  for (const lesson of lessons) {
    if (seen.has(lesson.order)) {
      fail(folder, `two lessons share the number ${lesson.order}`)
    }
    seen.add(lesson.order)
  }

  return lessons
}

/** Group lessons into chapters, keeping the order in which each chapter appears. */
function buildChapters(lessons: readonly Lesson[]): LessonChapter[] {
  const names: string[] = []
  const byChapter = new Map<string, Lesson[]>()

  for (const lesson of lessons) {
    const bucket = byChapter.get(lesson.chapter) ?? []
    if (bucket.length === 0) {
      names.push(lesson.chapter)
    }
    bucket.push(lesson)
    byChapter.set(lesson.chapter, bucket)
  }

  return names.map((name) => ({ name, lessons: byChapter.get(name) ?? [] }))
}

function buildCourse(folder: string, files: Map<string, string>): Course {
  const path = folder.split('/').slice(1)
  if (path.length < 2 || path.length > 3) {
    fail(folder, 'expected courses/<category>/[<subcategory>/]<course>/')
  }

  const slug = path[path.length - 1] as string
  const categorySlug = path[0] as string
  const subcategorySlug = path.length === 3 ? (path[1] as string) : null

  const intro = files.get('intro.md')
  if (!intro) {
    fail(folder, 'a course folder needs an intro.md')
  }

  const introPath = `${folder}/intro.md`
  const { data, body } = readCourseFrontmatter(introPath, intro)
  const lessons = orderLessons(folder, files, slug)

  return {
    slug,
    title: data.title,
    category: displayName(categorySlug, CATEGORY_NAMES),
    categorySlug,
    subcategory: subcategorySlug ? displayName(subcategorySlug, SUBCATEGORY_NAMES) : null,
    subcategorySlug,
    level: data.level,
    summary: data.summary,
    labels: data.labels,
    minutes: data.minutes,
    status: data.status,
    mark: `/marks/${slug}.svg`,
    theme: themeFor(slug),
    body,
    lessons,
    chapters: buildChapters(lessons),
    lessonMinutes: lessons.reduce((total, lesson) => total + lesson.minutes, 0),
  }
}

const parsedCourses = [...groupByFolder(pageFiles).entries()]
  .map(([folder, files]) => buildCourse(folder, files))
  .sort((a, b) => a.title.localeCompare(b.title))

const seenSlugs = new Set<string>()
for (const course of parsedCourses) {
  if (seenSlugs.has(course.slug)) {
    throw new Error(`Two courses share the slug "${course.slug}". Folder names must be unique.`)
  }
  seenSlugs.add(course.slug)
}

/** Every course, sorted by title. */
export const courses: readonly Course[] = parsedCourses

/**
 * Compare two groups so courses sitting directly under a category lead, then the
 * subcategories in the configured order.
 */
function compareGroups(a: [string | null, Course[]], b: [string | null, Course[]]): number {
  if (a[0] === b[0]) {
    return 0
  }
  if (a[0] === null) {
    return -1
  }
  if (b[0] === null) {
    return 1
  }
  return compareWithOrder(a[0], b[0], SUBCATEGORY_ORDER)
}

/** Order categories by the configured list, then alphabetically. */
function compareCategories(a: CourseCategory, b: CourseCategory): number {
  return compareWithOrder(a.slug, b.slug, CATEGORY_ORDER)
}

function buildCatalogue(all: readonly Course[]): CourseCategory[] {
  const byCategory = new Map<string, { name: string; groups: Map<string | null, Course[]> }>()

  for (const course of all) {
    const category = byCategory.get(course.categorySlug) ?? {
      name: course.category,
      groups: new Map<string | null, Course[]>(),
    }
    const group = category.groups.get(course.subcategorySlug) ?? []
    group.push(course)
    category.groups.set(course.subcategorySlug, group)
    byCategory.set(course.categorySlug, category)
  }

  return [...byCategory.entries()]
    .map(([slug, category]) => ({
      slug,
      name: category.name,
      groups: [...category.groups.entries()]
        .sort(compareGroups)
        .map(([groupSlug, groupCourses]) => ({
          slug: groupSlug,
          name: groupSlug ? displayName(groupSlug, SUBCATEGORY_NAMES) : null,
          courses: groupCourses,
        })),
    }))
    .sort(compareCategories)
}

/** The course tree the home page renders, grouped by category and subcategory. */
export const catalogue: readonly CourseCategory[] = buildCatalogue(courses)

/** Look a course up by its URL slug. Returns undefined for unknown slugs. */
export function findCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug)
}

/** Look a lesson up inside a course. Returns undefined for unknown slugs. */
export function findLesson(courseSlug: string, lessonSlug: string): Lesson | undefined {
  return findCourse(courseSlug)?.lessons.find((lesson) => lesson.slug === lessonSlug)
}
