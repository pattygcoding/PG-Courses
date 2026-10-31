---
title: React
level: Intermediate
summary: Build an interface from components, keep state predictable, and ship a tested bundle that renders on the server too.
labels:
  - Framework
  - Frontend
  - Components
minutes: 26
status: draft
---

## What this course is

React is a view library with a small API and a large set of conventions around it. It renders a tree of
components, compares the new tree with the previous one, and updates the parts of the document that
changed. Everything else in a React application, which means routing, data fetching, state management and
testing, comes from separate packages that you choose.

The mental model is the part that earns the time: a component is a function of its props and its state, and
the output for a given input is the same every time it runs. Once that is clear, the ecosystem choices stop
being arbitrary. This course is written against React 19.3, the React Compiler at 1.0, Vite 8, React Router
8 and Vitest 5.

React is deliberately not a framework. There is no router in it, no data layer and no server. The pages
here build those pieces from `react-router`, `fetch` and the action APIs, and they say where the line sits.
A framework that puts those decisions back together is Next.js, which has its own course.

## Who it is for

You write JavaScript or TypeScript and want to build an interface you would ship rather than the counter
from the documentation. If you already use another component framework, the early pages move faster, and
the state model is the part to unlearn first. Nothing here assumes you have written a server.

## What you will build

A catalogue for a library. It lists books, filters them, opens a page per book, records loans through a
validated form, and shows a waiting list with an optimistic count. Along the way you add routes with
loaders and actions, a context for the session, custom hooks, error boundaries, Suspense, a compiler
measurement, tests for all of it, and a server render of one page that hydrates in the browser.

Every page leaves you with an application that runs and a command you can run to check it.

## Prerequisites

TypeScript, enough HTML and CSS to lay out a page, and Node.js 22.12 or later for Vite. Some packages ask
for more than that, and the second page shows what npm does when a package wants a newer Node than you
have. A terminal, an editor, and a browser with developer tools complete the list.

## How the pages are ordered

The first chapter sets up the project and the JSX that every later page writes. State and events come next,
because a component without state is a template. Effects, data fetching and custom hooks follow, then forms
and the action APIs that React 19 added. Routing, performance and testing get a chapter each, and the course
ends with accessibility, server rendering and the build.
