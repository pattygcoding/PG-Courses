---
title: Where to go next
summary: The references worth keeping open, the courses that build on this one, and what to practise.
chapter: Idioms and the edges
minutes: 12
status: draft
---

## What this course should have left you with

- Reading a value's type before trusting it, with `Array.isArray`, `Number.isInteger` and `Object.hasOwn`.
- Knowing which methods copy and which mutate, and choosing deliberately.
- Writing an asynchronous function that bounds its waits, handles its failures and can be cancelled.
- Understanding that a module is strict, that a closure holds its scope alive, and that a promise settles once.
- Measuring before optimising, and knowing that a hidden class or a megamorphic call site is a thing that exists.
- Knowing where the language stops and the host begins, so `process` in a browser is a thing you expect rather than a
  mystery.

## The references

**MDN** is the reference for the standard library. Every page has the signature, the edge cases, the compatibility table
and an example, and the compatibility table is the one place to check before using something recent.

**The ECMAScript specification** answers the question MDN describes. It is dense and it is the final answer for what
`==` does, what order keys come back in and when an `await` resumes. The daily-use entry points are the abstract
operations `ToPrimitive`, `ToString`, `ToNumber` and the sections on jobs and modules.

**The TC39 proposals repository** lists every proposal by stage. Reading a stage 3 proposal is the way to learn about a
feature before it ships, and the README for the process explains what each stage means.

**`node.green` and `caniuse.com`** answer whether the target has a feature. They take ten seconds and they save a
misunderstanding.

## What to read in the source

Reading a small, well-written library teaches the shape of code that has survived contact with other people. A few
categories to look for:

- A parser or a tokeniser, which shows a state machine in ordinary code.
- A small reactive or event library, which shows closures and a dependency graph.
- An iterator-heavy data library, which shows a pipeline that stays lazy.
- The standard library itself, which is one click away from every MDN page and is the definitive example of the language
  used carefully.

## The standard library worth exploring next

| Area | Where to look |
| --- | --- |
| Streams | `ReadableStream`, `WritableStream`, `TransformStream` |
| Workers | `Worker`, `SharedArrayBuffer`, `Atomics` |
| Binary | `ArrayBuffer`, `DataView`, `Blob`, `File` |
| Crypto | `crypto.subtle`, `crypto.randomUUID`, `crypto.getRandomValues` |
| Internationalisation | `Intl` in full |
| Caching | `Cache`, `Headers`, `Response` |
| Observability in Node | `node:perf_hooks`, `node:diagnostics_channel` |

`TransformStream` and the workers are the two that change how a program is structured rather than adding a function, and
they are worth an afternoon each.

## The courses that build on this one

- **React** and **Vue** take the language into the browser with a component model, and both assume the closures,
  modules and async in this course.
- **Express** takes Node into an HTTP service, which is where the streams, the events and the process lifetime matter.
- **TypeScript** is not a course here and it is the natural next step for a codebase past a few thousand lines, because
  the type checker catches exactly the class of mistake this course spent its time warning about.

## Practice that stretches

1. **A tokeniser.** Take a small language and produce tokens with a generator. It uses the iteration protocol, the
   regular expressions and the error handling from this course in one program.
2. **A reactive system.** A `signal` with subscribers, using a `Set`, a `WeakMap` and the microtask queue, which is a
   smaller version of what a framework does.
3. **A command line tool.** Arguments, standard input, standard error, an exit code and a test suite with `node:test`.
4. **A JSON reporter.** Read a file, reshape it, sort it, format the numbers with `Intl`, and write it back. That is the
   tool this course built, and it is worth finishing.
5. **A tiny bundler.** Resolve an import graph, concatenate the modules, and produce a file. It is fifty lines and it
   explains what the tools you use are doing.

## The habit that matters most

The language will keep changing and the traps will keep being there. What does not change is the method: find out what a
value actually is, read the error rather than guessing, measure before optimising, and write the smallest program that
demonstrates the problem. Every lesson in this course is an instance of that method.

## Check yourself

Take the trickiest thing you built while reading this course and add one test for a case you are not sure about. Then
pick one library you use daily and read one of its source files from beginning to end.
