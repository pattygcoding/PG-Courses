// GitHub Pages serves 404.html for any path it cannot resolve on disk.  Because
// this is a single-page app with client-side routes, that fallback has to be a
// copy of index.html so the router can take over and render the right page.
import { copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, '..', 'dist')

await copyFile(resolve(dist, 'index.html'), resolve(dist, '404.html'))
console.log('Wrote dist/404.html from dist/index.html')
