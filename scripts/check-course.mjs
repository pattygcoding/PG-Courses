// Checks one course folder against the rules in AGENTS.md that can be checked
// mechanically: frontmatter fields, lesson file names, fence languages, banned
// patterns, trailing whitespace and the closing section.
//
//   node scripts/check-course.mjs courses/languages/rust
//
// It exits non-zero on the first run that finds something, so it can sit in a
// pre-commit step. The rules it cannot check are the ones about voice, which is
// why the checklist in AGENTS.md still ends with a read-through.
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const LESSON_FILE = /^(\d+)-([a-z0-9-]+)\.md$/
const FENCE = /^(`{3,})([A-Za-z0-9_+-]+)?\s*$/

/** Marketing words from AGENTS.md, plus the dismissive qualifiers. */
const BANNED_WORDS = [
  'blazing',
  'cutting-edge',
  'delve',
  'dive',
  'easily',
  'effortlessly',
  'elevate',
  'empower',
  'game-changer',
  'harness',
  'holistic',
  'journey',
  'landscape',
  'leverage',
  'naturally',
  'obviously',
  'paradigm shift',
  'realm',
  'revolutionary',
  'robust',
  'seamless',
  'simply',
  'state-of-the-art',
  'supercharge',
  'synergy',
  'tapestry',
  'testament to',
  'trivially',
  'turnkey',
  'unleash',
  'unlock',
]

/** Word occurrences that are part of a real name or a config key. */
const ALLOWED = [/`harness = false`/]

/** Openers that read as filler rather than explanation. */
const SIGNPOSTS = /^(Now let|Let us|In this section|To sum up|To recap|In conclusion|Before we begin)/

const REQUIRED_INTRO = ['title', 'level', 'summary', 'labels', 'minutes', 'status']
const REQUIRED_LESSON = ['title', 'summary', 'chapter', 'minutes', 'status']

const root = resolve(process.argv[2] ?? '')
const problems = []
const languages = new Map()

/** Split a page into its languages and the prose with fenced regions blanked. */
function splitFences(text) {
  const found = []
  const prose = []
  let inside = null

  for (const line of text.split('\n')) {
    const fence = FENCE.exec(line)

    if (fence && (inside === null || fence[1] === inside)) {
      if (inside === null) {
        inside = fence[1]
        if (fence[2]) found.push(fence[2])
      } else {
        inside = null
      }
      prose.push('')
      continue
    }

    prose.push(inside === null ? line : '')
  }

  return { found, prose: prose.join('\n') }
}

async function checkPage(path, name) {
  const raw = await readFile(path, 'utf8')
  const text = raw.replace(/\r\n/g, '\n')

  if (!text.endsWith('\n') || text.endsWith('\n\n')) {
    problems.push(`${name}: expected exactly one trailing newline`)
  }

  text.split('\n').forEach((line, index) => {
    if (line !== line.trimEnd()) {
      problems.push(`${name}:${index + 1}: trailing whitespace`)
    }
    if (/[\u2014\u2013]/.test(line)) {
      problems.push(`${name}:${index + 1}: em dash or en dash`)
    }
  })

  const { found, prose } = splitFences(text)
  for (const language of found) {
    languages.set(language, (languages.get(language) ?? 0) + 1)
  }

  if (/^# /m.test(prose)) {
    problems.push(`${name}: the page heading comes from title, so the body starts at ##`)
  }
  if (SIGNPOSTS.test(prose)) {
    problems.push(`${name}: signposting or summing up phrase`)
  }

  prose.split('\n').forEach((line, index) => {
    const lower = line.toLowerCase()
    for (const word of BANNED_WORDS) {
      if (!new RegExp(`\\b${word}\\b`).test(lower)) continue
      if (ALLOWED.some((allowed) => allowed.test(line.trim()))) continue
      problems.push(`${name}:${index + 1}: banned word "${word}"`)
    }
    if (/\bjust\b/.test(lower) && !ALLOWED.some((allowed) => allowed.test(line.trim()))) {
      problems.push(`${name}:${index + 1}: banned word "just"`)
    }
  })

  const front = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1]
  if (!front) {
    problems.push(`${name}: frontmatter missing`)
    return
  }

  const fields = new Set(
    [...front.matchAll(/^(\w+):/gm)].map((match) => match[1]),
  )

  const isIntro = name === 'intro.md'
  const required = isIntro ? REQUIRED_INTRO : REQUIRED_LESSON

  for (const field of required) {
    if (!fields.has(field)) problems.push(`${name}: missing frontmatter field "${field}"`)
  }

  if (!isIntro && !LESSON_FILE.test(name)) {
    problems.push(`${name}: lesson files must be named <number>-<slug>.md`)
  }

  if (!isIntro && prose.split('## Check yourself').length !== 2) {
    problems.push(`${name}: needs exactly one "## Check yourself" section`)
  }
}

const entries = await readdir(root)
const pages = entries.filter((entry) => entry.endsWith('.md'))

for (const page of pages) {
  await checkPage(join(root, page), page)
}

const lessons = pages.filter((page) => page !== 'intro.md').length

console.log(`${root}`)
console.log(`  ${lessons} lessons and ${pages.length === lessons ? 0 : 1} intro page`)
console.log(`  fence languages: ${[...languages.keys()].sort().join(', ')}`)

if (problems.length > 0) {
  console.error('')
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log('  no mechanical issues')
