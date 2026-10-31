---
title: Angular
level: Intermediate
summary: Build a catalogue application with signals, routing, typed forms and HTTP, then set up the build, the tests and the release bundle.
labels:
  - Framework
  - Frontend
  - TypeScript
minutes: 26
status: draft
---

## What this course is

Angular is a framework rather than a rendering library. It ships a compiler that turns your templates
into instructions, a dependency injection container that builds and shares your objects, and
first-party packages for routing, forms and HTTP. Those parts are designed to fit together, and the
parts decide most of the shape of a large application before you write any code of your own.

The framework changed direction over the last few releases, and this course is written against v22.
Three things matter from the start:

- Standalone components are the default. There are no `NgModule` files in a new project.
- Signals are the state primitive. A component reads a signal in a template and Angular knows exactly
  which part of the page to update.
- Zone.js is gone from new projects. Change detection is notified by signals, events and the router
  instead of by patching browser APIs, which is why a signal read is now the difference between an
  update and a no-op.

TypeScript is the language here, and the language has its own course. This one stays on the framework:
components, templates, signals, injection, the router, forms, HTTP, testing and the build.

## Who it is for

You write TypeScript and want to ship an application with it. If you already use another component
framework, the templates and the lifecycle are the parts to learn fresh, and the state model is the
part that pays off first. Nothing here assumes you have written a server or a front end before.

## What you will build

A catalogue for a library. It lists books, searches them, opens a page per book, records loans
through a validated form, and talks to a small JSON API. Along the way you add lazy routes, a
deferred summary block, an HTTP interceptor and tests that run in Vitest. The last pages cover the
production build, server rendering and the upgrade path.

Every page leaves you with an application that starts and a command you can run to check it.

## Prerequisites

TypeScript with strict checks on, enough HTML and CSS to lay out a page, and Node.js 22.22.3 or
later. The CLI refuses to run on older versions, which the second page shows. A terminal and an
editor complete the list.

## How the pages are ordered

The first chapter installs the tooling and writes one component, then the template language, because
every later chapter reads a template. Signals come next, since a component, a route and a form all
read state the same way. Components, injection, routing and forms follow in that order, then HTTP,
testing, and finally the build, accessibility, server rendering and deployment.
