# AGENTS.md

Guidance for AI assistants and people editing this repository.

## What this file is for

This repository publishes courses and lesson notes. Lesson bodies are Markdown files that live
under `src/content/lessons/`, and the course catalogue lives in `src/content/courses.ts`.

The rules below exist because generated prose has a recognisable accent. It reads as filler even
when the facts are correct, and readers of a programming course notice. Every rule applies to
lesson Markdown, course summaries in `courses.ts`, page copy, commit messages, and code comments.

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

A lesson ends on the last useful sentence. The next heading is the signpost.

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

## Lesson file format

Each lesson is one Markdown file at `src/content/lessons/<course-slug>/<lesson-slug>.md`, where both
slugs match the entries in `src/content/courses.ts`.

````markdown
---
title: Borrowing and the borrow checker
course: rust-foundations
lesson: borrowing
minutes: 45
status: draft
summary: Immutable and mutable references, the aliasing rule, and how to read borrow errors.
---

## What you are building

One short paragraph. State the outcome in the first two sentences.

## Prerequisites

- A link to the earlier lesson this one builds on.

## The idea

Explanation first, code second. Give the reason before the syntax.

## Build it

1. Numbered step.
2. The next step, ending in code that runs.

```rust
fn main() {
    println!("hello");
}
```
````

## Check yourself

Two or three questions, then the command that proves the code works.

## What went wrong first

Optional. Show the dead end and explain why it fails.

```

Rules for lesson files:

- The loader owns the single `#`-level heading. Start body content at `##`.
- Frontmatter fields must match the lesson type in `src/content/lessons.ts` once that loader lands.
- Every fenced code block declares a language. Use `text` for program output.
- Keep code lines under about 90 characters where the language allows it.
- No trailing whitespace, exactly one trailing newline.

## Repository conventions

- Vue 3 single-file components with `<script setup lang="ts">`. TypeScript is strict; do not use
  `any`.
- Styling uses Tailwind utilities plus the design tokens in `src/styles.css`. Add a colour as a CSS
  variable, never as a hex value inside a component.
- Every page sits inside a `.shell` wrapper and opens with a `.page-heading` block.
- Tests are colocated as `*.spec.ts` next to the module they cover. Run them with `npm test`.
- Before committing: `npm run typecheck && npm test && npm run build`.

## Checklist before a lesson is published

1. No em dashes.
2. No "it is not X, it is Y" shapes.
3. No emojis.
4. No marketing vocabulary from the list above.
5. Headings are sentence case.
6. Every code block declares a language.
7. The frontmatter `status` agrees with the course catalogue.
8. The code was run, not only written.
```
