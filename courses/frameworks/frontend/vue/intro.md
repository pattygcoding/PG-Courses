---
title: Vue
level: Intermediate
summary: Build an interface from single file components, understand what the reactivity system tracks, and ship a tested bundle that renders on the server too.
labels:
  - Framework
  - Frontend
  - Components
minutes: 25
status: draft
---

## What this course is

Vue is a framework in two halves: a runtime that renders components, and a compiler that turns a template into
the code the runtime runs. The template is not a string and it is not a second language; it is compiled, which is
why the compiler can tell the runtime exactly which parts of a page can change. That information is the reason a
Vue application updates the DOM with less work than a hand-written one.

The reactivity system is the other half worth understanding early. Vue tracks which reactive values each part of
the template used, so a change updates the places that read it and nothing else. Once that is clear, the
questions that fill Vue forums, such as why a destructured prop stopped updating or why a child re-rendered, have
answers rather than workarounds. This course is written against Vue 3.5.44, Vue Router 5.4, Pinia 4.1, Vite 8 and
Vitest 4.

Vue is a framework rather than a library, and it stops short of being a metaframework. Routing, state and the
build are official packages you install. Server rendering is the compiler's `renderToString` plus a server you
write, and Nuxt is the metaframework that puts routing, data loading and rendering back together.

## Who it is for

You write JavaScript or TypeScript and want to build an interface you would ship rather than the counter from the
documentation. If you have used another component framework, the early pages move faster, and the reactivity
model is the part to unlearn first. Nothing here assumes you have written a server.

## What you will build

A catalogue for a library. It lists books, filters them, opens a page per book that fetches its data and exposes
it to the components inside it, records loans through a guarded form, and shows a waiting list that counts
optimistically before the request lands. Along the way you add a router with guards and lazy routes, Pinia
stores, composables, slots, provide and inject, tests for all of it, and a measured look at what the template
compiler emits.

Every page leaves you with an application that runs and a command you can run to check it.

## Prerequisites

TypeScript, enough HTML and CSS to lay out a page, and Node.js 22.18 or later, which is what the scaffolded
project declares in its `engines` field. A terminal, an editor, and a browser with developer tools complete the
list.

## How the pages are ordered

The first chapter sets up the project and the template every later page writes. The reactivity chapter is the
longest, because everything after it depends on it. Components, forms and stores come next, then the two pages on
data and routing, then performance and testing, and the course ends with accessibility, server rendering and the
build.
