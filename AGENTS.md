# AGENTS.md

Guidance for AI assistants and people editing this repository.

## What this file is for

This repository publishes courses. Each course is a folder under `courses/` with an `intro.md`
inside it, and the site builds its catalogue from that tree:

```
courses/<category>/[<subcategory>/]<course>/intro.md
```

The intro page is the course's first page. Later lesson pages will sit beside it, and the same
frontmatter and prose rules apply to them.

The rules below exist because generated prose has a recognisable accent. It reads as filler even
when the facts are correct, and readers of a programming course notice. Every rule applies to course
and lesson Markdown, summaries, page copy, commit messages, and code comments.

## Voice

Write like a working engineer explaining something to a colleague.

- First person and plain statements. "I run the tests before shipping" beats "tests should be run".
- One idea per sentence. Delete any sentence that only restates the one before it.
- Lead with the concrete case, then generalise from it.
- Name the trade-off. If a technique is slower, say so and say when it is still the right call.
- Second person is fine for instructions: "Open the crate root and add the dependency."

## Banned patterns

### 1. Em dashes

Do not use an em dash (U+2014), and do not use an en dash (U+2013) as a stand-in for one. Do not
swap in a spaced hyphen either. Restructure the sentence instead.

| Instead of                                                                      | Write                                                                         |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `The borrow checker is strict — and that is the point.`                         | `The borrow checker is strict, and that is the point.`                        |
| `Ownership — the rule that a value has one owner — is checked at compile time.` | `Ownership, the rule that a value has one owner, is checked at compile time.` |

Hyphens inside compound words (`compile-time`, `read-only`, `two-phase`) and inside ranges
(`10-20 ms`) are fine.

### 2. The "it is not X, it is Y" construction

This shape is common in generated text and reads as a slogan rather than an explanation. State the
thing directly, or give each side its own sentence.

Banned shapes:

- `It is not about X, it is about Y.`
- `This is not X. It is Y.`
- `Not X, but Y.`
- `Less about X, more about Y.`
- `X is not the goal, Y is.`
- `This is more than just X.`

| Instead of                                        | Write                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Rust is not about safety, it is about control.`  | `Rust gives you explicit control over memory, and the compiler rejects code that breaks its own rules.` |
| `This is not just a tutorial, it is a workflow.`  | `The steps repeat across three small projects, so the workflow becomes habit.`                          |
| `Ownership is not a feature, it is a constraint.` | `Ownership is one rule the compiler enforces before your program runs.`                                 |

### 3. Emojis and decorative marks

No emojis, anywhere: headings, list items, callouts, table cells, commit messages, or code
comments. A check mark or a warning sign beside a paragraph is decoration rather than information.
Use a plain label word instead, such as "Note", "Gotcha", or "Trade-off".

Do not use arrow characters or box drawing as decoration either. Write the words.

### 4. Marketing vocabulary

These words promise more than the sentence delivers. Replace them with what actually happens.

Avoid: delve, dive, deep dive, unleash, supercharge, game-changer, seamless, effortlessly, robust,
leverage, elevate, empower, unlock, harness, cutting-edge, state-of-the-art, best-in-class, blazing
fast, revolutionary, paradigm shift, turnkey, holistic, synergy, journey, realm, landscape,
tapestry, testament to.

| Instead of                                            | Write                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `Leverage the type system to unlock safer refactors.` | `The type system reports every call site that still uses the old shape.` |
| `A seamless build pipeline.`                          | `Pushing to main runs the type check, the tests and the deploy.`         |

### 5. Rhetorical questions as openers

Do not open a section with a question the reader never asked. This covers "Ever wondered why the
borrow checker...", "What if I told you...", "Sound familiar?" and "Ready to level up?". Start with
the statement the question was standing in for.

### 6. Dismissive qualifiers

Avoid `simply`, `just`, `obviously`, `clearly`, `of course`, `naturally`, `easily`, `trivially`,
and `needless to say`. They add nothing, and they tell a stuck reader that the problem is theirs.
Delete them. If a step really is short, show it and let it be short.

### 7. Summing up and signposting

Delete these:

- Closers: "In conclusion", "To sum up", "To recap", "Remember that", "The key takeaway is".
- Signposts: "Now let's look at", "Let's dive into", "In this section we will", "Before we begin",
  "Without further ado", "As mentioned earlier".

A page ends on the last useful sentence. The next heading is the signpost.

### 8. Hype about importance

Do not tell the reader how important the material is. Avoid "This is a crucial concept", "as we all
know", "it is worth noting that", "it is important to remember", and "one of the most powerful
features". The explanation shows why something matters. Where you would write "Note that X", write
X.

### 9. Forced lists and triads

Do not pad a list to three items, and do not turn one idea into bullets. Use a list when the items
are parallel and countable, or when the section is a procedure. Otherwise use a paragraph.

### 10. Scare quotes and invented capitals

Avoid quotation marks around ordinary words for emphasis. Avoid capitalising a common noun because
it feels important ("the Platform", "the System"). Product names keep their own capitalisation.

### 11. Title Case and excess emphasis

Use sentence case in headings: "Add the second borrow" rather than "Add The Second Borrow". Keep
bold for UI labels and one-line callouts. Do not bold a phrase in every paragraph.

## Course scope

One course covers one subject, and the folder tree already supports the split, so use it rather than
letting a course sprawl:

- A language course covers the language, its standard library and the tooling that belongs to the
  language. It sits at `courses/languages/<language>/`.
- A framework or platform course covers the runtime, the framework, the hosting model and how the
  result is deployed. It sits at `courses/frameworks/<frontend|backend>/<framework>/`.

C# and .NET are split that way on purpose. The C# course owns the type system, records, generics, LINQ
and `async` as syntax. The .NET course owns ASP.NET Core, the host, the service container,
configuration, persistence and packaging. Neither repeats the other, and each names the other once so a
reader knows where the other half lives.

When a course starts to cover a second subject, that is the signal to split it. Two focused intros read
better than one that changes subject halfway, and a reader who came for one of them does not have to
skip past the other.

## Course and lesson files

A course lives at `courses/<category>/[<subcategory>/]<course>/`. Its first page is `intro.md`, and
its lessons sit beside it, numbered:

```text
courses/languages/python/intro.md
courses/languages/python/01-how-python-runs.md
courses/languages/python/02-installing-and-versions.md
```

The number sets the reading order and the rest of the filename is the slug, so renaming a file to
reorder it never changes its URL. A file that does not match `<number>-<slug>.md` stops the build.

The folder names are the slugs. A course's URL, its mark and its place in the catalogue all come
from where the folder sits, so moving a folder moves the course.

Frontmatter is what the loader reads:

```yaml
title: Python
level: Beginner
summary: Write Python that reads well, handles real data, and runs as a command line tool you would keep.
labels:
  - Language
  - Automation
  - Data
minutes: 18
status: draft
```

| Field     | Type                                     | Notes                                                      |
| --------- | ---------------------------------------- | ---------------------------------------------------------- |
| `title`   | string                                   | The page heading and the card title.                       |
| `level`   | `Beginner`, `Intermediate` or `Advanced` | Shown on the card and in the page eyebrow.                 |
| `summary` | string                                   | One sentence. Used on the card and as the page standfirst. |
| `labels`  | list of strings                          | Two or three short tags.                                   |
| `minutes` | positive number                          | Reading time for this page.                                |
| `status`  | `draft` or `planned`                     | `draft` means written, `planned` means outlined only.      |

`slug`, `category`, `subcategory` and `mark` are derived from the folder path, so do not write them
in the frontmatter. The loader fails the build when a field is missing or the wrong type, which is
the point: a broken page stops the deploy.

Use the same sections in every intro page, in this order:

1. `## What this course is`
2. `## Who it is for`
3. `## What you will build`
4. `## Prerequisites`
5. `## How the pages are ordered`

## Lesson files

Lessons use a smaller set of fields:

```yaml
title: Names, objects and binding
summary: A name is attached to an object, and assignment never copies.
chapter: Language basics
minutes: 12
status: draft
```

| Field     | Type                 | Notes                                                     |
| --------- | -------------------- | --------------------------------------------------------- |
| `title`   | string               | The lesson heading and its entry in the contents list.    |
| `summary` | string               | One sentence, shown under the title in the contents list. |
| `chapter` | string               | The section of the contents list this lesson belongs to.  |
| `minutes` | positive number      | Reading time for this lesson.                             |
| `status`  | `draft` or `planned` |                                                           |

Chapters appear in the contents list in the order their first lesson appears, so a chapter needs no
registration anywhere. Keep the chapter names consistent inside a course, with a capital on the
first word only.

A lesson ends with `## Check yourself`, which names something to run or work out. It is not a summary
of what the reader has just read.

Rules for course and lesson files:

- The page heading comes from `title`. Start body content at `##`.
- Every fenced code block declares a language. Use `text` for program output and `pycon` for a
  session transcript.
- Keep code lines under about 90 characters where the language allows it.
- Show the output of a snippet when the output is the point, and only when you have run it.
- No trailing whitespace, exactly one trailing newline.

## Code blocks

Every fenced block is highlighted and carries a copy button, so write a block for a reader who will
paste it into a terminal.

- Declare a language on every fence. `text` for program output and `pycon` for a Python session
  transcript are deliberate choices: neither is coloured, and that is correct for the content.
- Put output in its own block rather than as a trailing comment inside the code, so the copy button
  hands over something that runs.
- Leave the shell prompt out of a `bash` block. A `$` or `>>>` in the copied text has to be deleted
  by hand, and the prompt is not part of the command.
- Register a language before fencing with it. Import its grammar in `src/content/highlight.ts`, add
  it to `LANGUAGES`, and register any alias you intend to type. A test walks every course and every
  lesson and fails with the file name and the language that is missing, so an unregistered fence is
  caught before it ships.
- When highlight.js has no grammar for the language, write a small one in that file, as `pycon` and
  `gitignore` do. Marking the one part worth marking reads better than forcing an unrelated grammar
  onto the content.
- Keep a block to what fits in one look. Split a long listing into labelled steps, and say what
  changed between them.

## Repository conventions

- Each course has a mark at `public/marks/<course-slug>.svg`, drawn from plain shapes in the navy and
  mint palette, so it stays crisp at icon size and needs no fonts.
- The catalogue is derived from the folders, not listed a second time. Add a folder with an
  `intro.md` and the home page picks it up.
- Lessons work the same way. Add a numbered Markdown file and the contents list, the lesson route and
  the sitemap pick it up. Nothing is registered by hand.
- Display order for categories and subcategories lives in `CATEGORY_ORDER` and `SUBCATEGORY_ORDER`
  in `src/content/courses.ts`. Adding a folder needs no edit there unless it has to sit in a
  specific place.
- Vue 3 single-file components with `<script setup lang="ts">`. TypeScript is strict; do not use
  `any`.
- Styling uses Tailwind utilities plus the design tokens in `src/styles.css`. Add a colour as a CSS
  variable, never as a hex value inside a component.
- Rendered Markdown is styled by the `.prose` block in `src/styles.css`, and code is coloured by
  highlight.js with token colours defined as CSS variables there.
- A lesson page wraps its body in `MarkdownBody`, which owns the delegated handler for the copy
  buttons the renderer puts beside each code block.
- Every page sits inside a `.shell` wrapper and opens with a `.page-heading` block.
- Tests are colocated as `*.spec.ts` next to the module they cover. Run them with `npm test`. The
  catalogue test fails when a mark is missing, so run it after adding a course.
- Before committing: `npm run typecheck && npm test && npm run build`.

## Checklist before a course or lesson is published

1. No em dashes or en dashes.
2. No "it is not X, it is Y" shapes.
3. No emojis.
4. No marketing vocabulary from the list above.
5. Headings are sentence case.
6. Every fenced block declares a language, and that language is registered in
   `src/content/highlight.ts`.
7. `labels` holds two or three short tags, and `status` is honest.
8. A mark exists at `public/marks/<course-slug>.svg`.
9. Lesson files are named `<number>-<slug>.md` and every lesson carries a `chapter`.
10. The code was run, not only written.
