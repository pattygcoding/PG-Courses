---
title: Rust
level: Intermediate
summary: Learn ownership, borrowing, traits and the type system by building tools that run, from cargo new to async and unsafe.
labels:
  - Language
  - Systems
  - Memory
minutes: 18
status: draft
---

## What this course is

Rust is a systems language whose compiler proves memory safety before the program runs. The features
worth learning are the ones that make that possible: ownership, borrowing, lifetimes, traits, and a type
system that carries those rules through your code. This course covers the language, its standard library
and the tooling that ships with it.

## Who it is for

You write code in another language and want to build things that run close to the machine: command line
tools, services, parsers, anything where speed and memory matter. You do not need to know C or C++, and
nothing in the early lessons assumes you have written a language with manual memory management.

## What you will build

A command line tool that reads files, parses a format, transforms records and reports on them. It grows
across the course, and each language feature earns its place in the code. By the end you have a crate
with unit and integration tests, documentation, benchmarks, a release profile tuned on measurements, and
an async command that talks to a network service.

## Prerequisites

A terminal, and a working knowledge of another language. `rustup` installs the toolchain itself, which
the first chapter covers.

## How the pages are ordered

The pages start with Cargo and ownership, because everything later depends on both. From there they move
through types, traits, error handling, collections and iterators, then testing, concurrency and
performance, and finish with macros, FFI, `no_std` and the parts of the language that need `unsafe`. Read
them in order the first time, following the contents list on this page.
