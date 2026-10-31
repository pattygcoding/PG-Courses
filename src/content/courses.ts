import { load } from 'js-yaml'

/**
 * The course catalogue, derived from the folder tree under `courses/`.
 *
 * Every course is a folder containing an `intro.md`, at one of two depths:
 *
 *   courses/<category>/<course>/intro.md
 *   courses/<category>/<subcategory>/<course>/intro.md
 *
 * The folder names are the slugs, so a course's URL, its mark and its place in
 * the catalogue all come from where it sits. Only the prose fields live in the
 * frontmatter, which keeps the two from drifting apart.
 */

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced'

/** `draft` pages are written, `planned` pages are outlined only. */
export type LessonStatus = 'draft' | 'planned'

export interface Course {
  /** Folder name, used in the URL as /courses/:slug. */
  readonly slug: string
  readonly title: string
  /** Display name of the top level category, for example "Languages". */
  readonly category: string
  readonly categorySlug: string
  /** Display name of the middle folder, or null when the course sits directly under a category. */
  readonly subcategory: string | null
  readonly subcategorySlug: string | null
  readonly level: CourseLevel
  readonly summary: string
  /** Short tags shown on the card, for example "Frontend" or "Automation". */
  readonly labels: readonly string[]
  /** Reading time for this page, in minutes. */
  readonly minutes: number
  readonly status: LessonStatus
  /** Public path of the course mark, derived from the slug. */
  readonly mark: string
  /** Markdown body of the course's first page. */
  readonly body: string
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

interface Frontmatter {
  readonly title: string
  readonly level: CourseLevel
  readonly summary: string
  readonly labels: readonly string[]
  readonly minutes: number
  readonly status: LessonStatus
}

const LEVELS: readonly CourseLevel[] = ['Beginner', 'Intermediate', 'Advanced']
const STATUSES: readonly LessonStatus[] = ['draft', 'planned']

/** Human names for the top level folders. Anything unlisted is title cased. */
const CATEGORY_NAMES: Record<string, string> = {
  languages: 'Languages',
  frameworks: 'Frameworks',
}

/** Human names for the middle folders. */
const SUBCATEGORY_NAMES: Record<string, string> = {
  backend: 'Backend',
  frontend: 'Frontend',
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

function parseFrontmatter(file: string, raw: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) {
    fail(file, 'is missing its frontmatter block')
  }

  const parsed: unknown = load(match[1])
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail(file, 'frontmatter must be a mapping of keys to values')
  }

  const source = parsed as Record<string, unknown>
  return {
    data: {
      title: requireString(file, source, 'title'),
      level: requireChoice(file, source, 'level', LEVELS),
      summary: requireString(file, source, 'summary'),
      labels: requireStringList(file, source, 'labels'),
      minutes: requireNumber(file, source, 'minutes'),
      status: requireChoice(file, source, 'status', STATUSES),
    },
    body: raw.slice(match[0].length).trim(),
  }
}

function parseCourse(path: string, raw: string): Course {
  const folders = path
    .split('/')
    .filter((segment) => segment.length > 0)
    .slice(1, -1)
  if (folders.length < 2 || folders.length > 3) {
    fail(path, 'expected courses/<category>/[<subcategory>/]<course>/intro.md')
  }

  const slug = folders[folders.length - 1] as string
  const categorySlug = folders[0] as string
  const subcategorySlug = folders.length === 3 ? (folders[1] as string) : null
  const { data, body } = parseFrontmatter(path, raw)

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
    body,
  }
}

// Eager so the catalogue is available on first render; the raw bodies are small
// text files and there are few of them.
const introFiles = import.meta.glob('/courses/**/intro.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const parsedCourses = Object.entries(introFiles)
  .map(([path, raw]) => parseCourse(path, raw))
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

/** Compare two groups so a category's ungrouped courses lead, then the rest by name. */
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
  return a[0].localeCompare(b[0])
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
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** The course tree the home page renders, grouped by category and subcategory. */
export const catalogue: readonly CourseCategory[] = buildCatalogue(courses)

/** Look a course up by its URL slug. Returns undefined for unknown slugs. */
export function findCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug)
}
