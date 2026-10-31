---
title: TypeScript
level: Intermediate
summary: Model a program with the type system, and let the compiler prove things about it before anything runs.
labels:
  - Language
  - Types
  - Tooling
minutes: 18
status: draft
---

## What this course is

TypeScript is JavaScript with a type checker. Every type you write is erased before the code runs, so nothing about the
annotations exists at run time and nothing about the runtime changes. What changes is that the compiler reads your
program and tells you which of the paths through it cannot work.

That makes the subject the type system and the tooling around it: inference, unions and narrowing, generics, mapped,
conditional and template literal types, classes, declaration files, and the configuration that decides how much the
compiler checks. This course covers all of that, and it is honest about where the checking stops.

The runtime language has its own course. The JavaScript course covers coercion, closures, prototypes, the event loop
and the standard library, and TypeScript alters none of it. React, Vue and Express cover the hosts.

## Who it is for

You can already write JavaScript and want the compiler to catch more than a linter does, or you have a TypeScript
codebase with `any` in it and want to know what the language is actually for. Nothing here assumes you have written a
generic, a conditional type or a declaration file.

## What you will build

A small library with a typed public API, a declaration file that a consumer can read, tests that check the types as
well as the values, and a `tsconfig.json` where every flag is there because you chose it. The pieces accumulate across
the course, and the configuration is tightened one step at a time rather than all at once.

## Prerequisites

Node.js 20 or later and a terminal. Working JavaScript is required, because the types describe the behaviour of a
language you already know rather than replacing it. No build tooling is assumed.

## How the pages are ordered

The first pages install the compiler and cover inference and narrowing, which are the two ideas everything else rests
on. Then functions, classes and generics, then the type operators that let a type compute another type. The later
chapters cover the compiler configuration, declaration files, modelling a domain in types, and testing the types
themselves. Read them in order the first time, following the contents list on this page.
