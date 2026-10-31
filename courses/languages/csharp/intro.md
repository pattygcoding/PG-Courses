---
title: C#
level: Intermediate
summary: Use the C# type system well, from value and reference types to generics, records, LINQ and async, in code you run from a terminal.
labels:
  - Language
  - Typed
  - LINQ
minutes: 18
status: draft
---

## What this course is

C# is a statically typed language whose features mostly exist to let the compiler catch mistakes before
the program runs. This course is about that type system: value and reference types, nullable reference
types, generics that constrain rather than decorate, records for data, pattern matching, LINQ, and
`async` as a language feature.

The runtime and the web framework are a separate course. This one covers the language and the standard
library, and everything you write runs from a terminal.

## Who it is for

You know another typed language and want to use C# properly, or you write C# already and want to
understand the parts of the type system you have been working around.

## What you will build

A command line tool that reads files, transforms records and reports on them. It grows across the
course, and each new language feature earns its place in the code rather than arriving as an isolated
demo. By the end you have a small program with tests, a clear type model, and a reason for every type
you chose.

## Prerequisites

The .NET SDK and a terminal, since the compiler ships with it. Experience with any typed language is
enough to start.

## How the pages are ordered

The pages start with the type system and the project layout, move through records, generics and pattern
matching, and finish with LINQ and async. The tool grows as the pages do, so each one leaves you with
code that runs.
