---
title: Go
level: Intermediate
summary: Write Go that handles errors, concurrency and real services without fighting the language.
labels:
  - Language
  - Concurrency
  - Services
minutes: 18
status: draft
---

## What this course is

Go is a small language with a large standard library. The language fits in a few hours of reading: no classes, no
inheritance, no exceptions, one loop keyword and about twenty-five keywords in total. Almost all of the work is in the
parts that shape every Go program, and those parts are decisions rather than syntax:

- Errors are values that a function returns, so there is no exception to catch and no stack unwinding to reason about.
- An interface is satisfied by having the methods, so there is nothing to declare and no import for the contract.
- Concurrency is part of the language: a goroutine is a function call with `go` in front of it and a channel is a typed
  pipe.
- The standard library includes an HTTP server, a JSON encoder, a test runner and a profiler, so a service can be built
  without a framework.

This course covers the language, that standard library, and the toolchain that ships a binary. It is the same ground the
Python and Java courses cover for their languages.

The web layer has no separate course here. The `net/http` lessons in this course are the standard library's own package,
which is enough for a service with a JSON API. Express and FastAPI cover the same ground for Node and Python, and a Go
framework is a dependency to add once the standard library's version is understood.

## Who it is for

You have written code in another language and want Go's idioms rather than Go's syntax translated from somewhere else.
Nothing here assumes you have used goroutines, interfaces or generics, and nothing assumes you have built a service.

If you have written a little Go already, the first five pages will be quick and chapters three onwards are where the
language stops looking like C and starts being Go.

## What you will build

A command line tool that reads files, parses the data, writes a report and has tests that run with `go test`. Then a small
HTTP service with a JSON API, a request timeout, structured logs, graceful shutdown and a benchmark. Those two programs
carry the whole course: every chapter adds something to them rather than introducing a throwaway example.

The last third is the toolchain around shipping: modules and versions, cross-compilation, `vet`, the race detector,
profiling and fuzzing.

## Prerequisites

Go 1.25 or later and a terminal. The first lesson installs it and explains why the version matters. You need to be
comfortable reading a function with a type in it, and the course explains the rest of the syntax as it comes up.

## How the pages are ordered

The first chapter is the toolchain, because Go's tool is part of the language's design rather than an add-on. The second
and third cover types, values and functions, including the two decisions that cause most Go bugs: slices share a backing
array and a method receiver can be a value or a pointer. Then interfaces, generics, errors and concurrency, which is the
longest chapter because it is where most of Go's value is. The standard library, testing and the toolchain follow, and the
last chapters are the patterns a service uses.

Read them in order the first time, following the contents list on this page. Each lesson ends with something to run or
work out, and the later lessons assume the earlier code exists.
