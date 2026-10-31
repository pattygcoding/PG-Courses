// GitHub Pages serves a file per URL, so a client-side route only answers with a
// 200 when a matching file exists on disk.  This walks the course tree and writes
// a copy of index.html for every course page, every lesson page and one for
// unknown paths, then generates the sitemap from the same list.
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join, resolve } from 'node:path'

// Must match LESSON_FILE in src/content/courses.ts. The number sets the reading
// order and the rest of the filename is the slug, which is what the URL uses.
const LESSON_FILE = /^\d+-(.+)\.md$/

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const dist = join(root, 'dist')
const coursesRoot = join(root, 'courses')
const indexFile = join(dist, 'index.html')

/** The site origin, read from the CNAME file so the two cannot drift apart. */
const origin = `https://${(await readFile(join(root, 'public', 'CNAME'), 'utf8')).trim()}`

/** Every folder holding an intro.md, at any depth, with the files beside it. */
async function findCourses(dir) {
  const entries = await readdir(dir, { withFileTypes: true })

  if (entries.some((entry) => entry.isFile() && entry.name === 'intro.md')) {
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
    return [{ folder: dir, files }]
  }

  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => findCourses(join(dir, entry.name))),
  )
  return nested.flat()
}

/** Write a copy of index.html into a route folder, so the route answers with 200. */
async function writePage(...segments) {
  const target = join(dist, ...segments)
  await mkdir(target, { recursive: true })
  await copyFile(indexFile, join(target, 'index.html'))
}

const courses = await findCourses(coursesRoot)
const pages = []

for (const course of courses) {
  const slug = basename(course.folder)
  await writePage('courses', slug)
  pages.push({ path: `courses/${slug}/`, priority: '0.9', changefreq: 'weekly' })

  for (const name of course.files) {
    const lesson = LESSON_FILE.exec(name)
    if (!lesson) {
      continue
    }
    await writePage('courses', slug, lesson[1])
    pages.push({ path: `courses/${slug}/${lesson[1]}/`, priority: '0.7', changefreq: 'monthly' })
  }
}

await copyFile(indexFile, join(dist, '404.html'))

// The sitemap is generated rather than committed, so adding a lesson cannot leave
// a stale entry behind.
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...[{ path: '', priority: '1.0', changefreq: 'weekly' }, ...pages].flatMap((page) => [
    '  <url>',
    `    <loc>${origin}/${page.path}</loc>`,
    `    <changefreq>${page.changefreq}</changefreq>`,
    `    <priority>${page.priority}</priority>`,
    '  </url>',
  ]),
  '</urlset>',
  '',
].join('\n')

await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8')

const lessonCount = pages.length - courses.length
console.log(`Wrote ${courses.length} course pages, ${lessonCount} lesson pages and 404.html`)
console.log(`Wrote dist/sitemap.xml with ${pages.length + 1} URLs`)
