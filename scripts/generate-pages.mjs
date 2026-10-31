// GitHub Pages serves a file per URL, so a client-side route only answers with a
// 200 when a matching file exists on disk.  This writes a copy of index.html for
// every course and one for unknown paths, so a deep link or a refresh boots the
// app instead of showing the host's own error page.
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const dist = join(root, 'dist')
const coursesRoot = join(root, 'courses')
const indexFile = join(dist, 'index.html')

/** Every folder that holds an intro.md, at any depth. */
async function courseFolders(dir) {
  const entries = await readdir(dir, { withFileTypes: true })

  if (entries.some((entry) => entry.isFile() && entry.name === 'intro.md')) {
    return [dir]
  }

  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => courseFolders(join(dir, entry.name))),
  )
  return nested.flat()
}

const folders = await courseFolders(coursesRoot)

for (const folder of folders) {
  const slug = basename(folder)
  const target = join(dist, 'courses', slug)
  await mkdir(target, { recursive: true })
  await copyFile(indexFile, join(target, 'index.html'))
  const source = relative(coursesRoot, folder).split(sep).join('/')
  console.log(`Wrote dist/courses/${slug}/index.html from courses/${source}/intro.md`)
}

await copyFile(indexFile, join(dist, '404.html'))
console.log(`Wrote dist/404.html from dist/index.html (${folders.length} course pages)`)
