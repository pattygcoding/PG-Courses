import hljs from 'highlight.js/lib/core'
import type { LanguageFn } from 'highlight.js'
import bash from 'highlight.js/lib/languages/bash'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import groovy from 'highlight.js/lib/languages/groovy'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import makefile from 'highlight.js/lib/languages/makefile'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
/**
 * Syntax highlighting for lesson code.
 *
 * Only the languages listed here are imported, so the bundle grows when a
 * course needs a new one rather than carrying every language highlight.js
 * knows. To add one: import its grammar, add it to LANGUAGES, and register any
 * alternative spellings you intend to fence with.
 */
const LANGUAGES: Record<string, LanguageFn> = {
  bash,
  csharp,
  css,
  dockerfile,
  go,
  groovy,
  ini,
  java,
  javascript,
  json,
  makefile,
  plaintext,
  python,
  ruby,
  rust,
  sql,
  typescript,
  xml,
  yaml,
}

/**
 * A Python session transcript. highlight.js has no grammar for one, and running
 * Python highlighting over `>>>` prompt lines mis-colours them, so the prompt
 * is marked and the remaining output is left as plain text.
 */
const pycon: LanguageFn = () => ({
  name: 'Python console',
  contains: [{ className: 'meta', begin: /^>>> |^\.\.\. / }],
})

for (const [name, language] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, language)
}
hljs.registerLanguage('pycon', pycon)

/**
 * A single file component. highlight.js has no grammar for one, and writing one
 * from scratch would duplicate XML and TypeScript, so this spreads the XML
 * grammar and puts one rule in front of it: a `lang="ts"` script block is
 * coloured as TypeScript. The template is coloured as markup, and XML's own
 * rules already colour a `style` block as CSS.
 */
const vue: LanguageFn = (instance) => {
  const markup = xml(instance)

  return {
    ...markup,
    // The alias list belongs to XML, and a name can only be claimed once.
    aliases: undefined,
    contains: [
      {
        begin: /<script[^>]*\blang="ts"[^>]*>/,
        end: /<\/script>/,
        subLanguage: 'typescript',
        excludeBegin: true,
        excludeEnd: true,
      },
      ...(markup.contains ?? []),
    ],
  }
}

hljs.registerLanguage('vue', vue)

/**
 * An ERB template. highlight.js has no grammar for one, and standing one up
 * from scratch would duplicate XML, so this spreads the XML grammar with one
 * rule in front of it: everything between `<%` and `%>` is coloured as Ruby and
 * the markup around it keeps the XML rules. ERB written inside an attribute,
 * as in `<a href="<%= url %>">`, is inside XML's own tag rule by the time this
 * gets a look at it and is coloured as markup, which is a fair approximation.
 */
const erb: LanguageFn = (instance) => {
  const markup = xml(instance)

  return {
    ...markup,
    // The alias list belongs to XML, and a name can only be claimed once.
    aliases: undefined,
    contains: [
      {
        begin: /<%[=#-]?/,
        end: /-?%>/,
        subLanguage: 'ruby',
        excludeBegin: true,
        excludeEnd: true,
      },
      ...(markup.contains ?? []),
    ],
  }
}

hljs.registerLanguage('erb', erb)

/**
 * An ignore file: `#` comments and then patterns. highlight.js has no grammar
 * for one, and the patterns carry no syntax worth colouring, so the comments are
 * marked and the rest of the line is left alone.
 */
const ignoreFile: LanguageFn = () => ({
  name: 'Ignore file',
  contains: [{ className: 'comment', begin: /^#.*$/ }],
})

hljs.registerLanguage('gitignore', ignoreFile)
hljs.registerLanguage('dockerignore', ignoreFile)

/** Spellings that point at a grammar registered under another name. */
const ALIASES: Record<string, string> = {
  cfg: 'ini',
  conf: 'ini',
  console: 'bash',
  gradle: 'groovy',
  html: 'xml',
  js: 'javascript',
  properties: 'ini',
  sh: 'bash',
  shell: 'bash',
  svg: 'xml',
  toml: 'ini',
  ts: 'typescript',
  yml: 'yaml',
}

/**
 * `tsx` and `jsx` are deliberately absent above: the TypeScript and JavaScript
 * grammars declare those aliases themselves, so a fence for either one is
 * already coloured. highlight.js has no JSX grammar, so a tag is coloured as
 * TypeScript sees it rather than as markup.
 *
 * `rb` and `irb` are in the same position: the Ruby grammar claims both, and it
 * colours an `irb` transcript properly, marking the `>>` prompt and the `=>`
 * result lines while the Ruby between them keeps its own colours. A Gemfile and
 * a Rakefile are Ruby code, so they are fenced as `ruby` rather than as a name
 * of their own.
 */

for (const [alias, target] of Object.entries(ALIASES)) {
  const language = LANGUAGES[target]
  if (language) {
    hljs.registerLanguage(alias, language)
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Highlight one block of code. An unknown language name returns escaped plain
 * text, so a fence for a language nobody has registered still renders.
 */
export function highlightCode(code: string, language: string): string {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value
  }
  return escapeHtml(code)
}

/** Every language name the renderer can highlight, for tests and tooling. */
export function highlightedLanguages(): string[] {
  return Object.keys(LANGUAGES)
}

/**
 * Whether a fence language will be coloured rather than rendered as plain text.
 * `text` is deliberately not registered: output is left uncoloured.
 */
export function isHighlighted(language: string): boolean {
  return language.length > 0 && hljs.getLanguage(language) !== undefined
}
