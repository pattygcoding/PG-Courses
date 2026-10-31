---
title: JavaScript
level: Beginner
summary: Write JavaScript you can still read next year, from coercion and closures to promises, generators and the standard library.
labels:
  - Language
  - Async
  - Web
minutes: 18
status: draft
---

## What this course is

JavaScript started in the browser and now runs the build tools, the test runner and a large share of the
servers it talks to. This course is about the language itself and the standard library that comes with it:
types and coercion, functions and closures, prototypes and classes, iterators and generators, promises and
`async`, the collection and formatting types, and the tooling that runs and tests the result.

The host is a separate subject, and it is where a lot of what people call JavaScript lives. The DOM,
`fetch`, `localStorage` and the Web APIs belong to the browser. `fs`, `http`, streams and worker threads
belong to Node. React, Vue and Express are the courses for the frameworks built on those.

## Who it is for

You have written JavaScript that works and want to understand why it works, or you are fluent in another
language and want the parts that differ here. Nothing assumes you know closures, prototypes or `async`
before starting.

## What you will build

A command line tool that reads a file of records, cleans and transforms them, and writes a report. It grows
across the course, and each language feature earns its place in the code rather than arriving as an isolated
demo. By the end you have a small program with tests, a linter, a module layout you chose deliberately, and
a habit of checking what a value actually is before assuming.

## Prerequisites

Node.js 20 or later and a terminal. Chapter one explains which versions to install and why. There is no build
step, no framework and no TypeScript in the early pages.

## How the pages are ordered

The pages start with the runtime, modules and types, because everything later depends on them. From there
they move through functions and scope, objects and prototypes, errors and regular expressions, arrays and
data, generators and metaprogramming, and then the asynchronous half of the language. The final chapters
cover testing, performance, security and publishing. Read them in order the first time, following the
contents list on this page.
