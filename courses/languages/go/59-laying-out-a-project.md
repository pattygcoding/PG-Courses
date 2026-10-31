---
title: Laying out a project
summary: cmd, internal, package names, and why the standard library nestles the way it does.
chapter: Patterns and design
minutes: 12
status: draft
---

## The layout the tool implies

```text
repo/
  go.mod
  cmd/
    report/
      main.go            package main
    server/
      main.go            package main
  internal/
    store/
      store.go           package store
    parser/
      parser.go          package parser
  report/                package report  (an optional public API)
  Makefile
  README.md
```

There is no required layout beyond one module per repository and one package per directory. The conventions above are ones
the tool understands:

- **`cmd/<name>/main.go`** is the standard place for a `main` package, and it is what gives a program a name. A repository
  with a server and a CLI has two directories and one module.
- **`internal/`** restricts imports to the module, enforced by the compiler. Everything that is not a public API belongs
  there.
- **A directory holding `package foo`** is the package, and an import path is the module path plus that directory.
- **`testdata/`** is ignored by the tool, which is where fixtures go.

`cmd` and `internal` are the two worth using from the start, because they communicate intent: everything under `internal` is
free to change, and everything in `cmd` is a program rather than a library.

## Package names

- **Short, lowercase, one word, no underscores.** `parser` rather than `parsers` or `parse_util`.
- **No stutter with the path.** `xml.NewDecoder` rather than `xml.NewXMLDecoder`, because a caller writes the package name
  before every identifier.
- **A name that says what the package provides** rather than what it contains, so `store` and `parser` rather than `models`
  and `utils`.
- **No `util`, `common`, `helpers`, `base` or `models`.** Each is a package that grows in every direction, and choosing a
  real name is what forces the boundaries to be decided.

The test is the call site: `parser.Row(text)` reads, and `utils.Row(text)` says nothing about which of forty utilities it is.

## Where a type goes

```go
package store

type Row struct { ... }

func Find(ctx context.Context, id string) (Row, error)
```

A type belongs in the package that owns its behaviour rather than in a package of types. A `models` package holding every
struct in an application has no behaviour, which means every method on those structs lives somewhere else, which means either
the methods are in a package with no business owning them or the types are data bags that everything reaches into.

The exception is a type shared between two packages that neither owns, such as a wire format or a domain identifier. That
belongs in a third small package both import, and the argument for keeping it small is that both now depend on it.

## The dependency direction

```text
cmd/server  ->  api  ->  service  ->  store
                                  ->  model
```

Dependencies point one way, and the small-interface lesson is what makes that possible: the `service` package declares the
interface it needs from `store`, so `store` satisfies it with neither importing the other. A cycle is a compile error, and
the fix is always to move a type or an interface down to a package both sides can import.

The rule of thumb: a package imported by many should import few. `model` at the bottom of a graph with no dependencies is a
healthy sign; a `common` package that everything imports and that imports three things back is the shape that leads to a
cycle.

## What a package documents

```go
// Package parser turns text into rows.
//
// The format is one row per line, fields separated by a tab.
package parser
```

A comment above the `package` clause is the package documentation, and `go doc parser` prints it. With a doc comment per
exported identifier, that is a package's whole documentation, and the convention is the one from the tool lesson: the
comment starts with the name of the thing.

```go
// Parse returns the rows in text. It returns ErrEmpty when text is empty.
func Parse(text string) ([]Row, error)
```

The second sentence is the one worth writing and the one most often left out: what the function returns when it fails. A
caller reading `go doc` should not have to guess whether an absence is an error.

## What to keep out of the repository

- **Generated code with no generator.** If it cannot be regenerated it is source, and it belongs in a named file.
- **A `vendor` directory without a reason.** It multiplies the repository size and the diff of every dependency change.
- **An editor or OS file.** `.gitignore` handles those rather than tracking them.
- **A `docs` directory the code contradicts.** Documentation that is wrong is worse than none, and the package comment is the
  one that lives beside the code and gets updated with it.
- **A configuration file with a credential in it.** An example file with the keys and no values, and the real value in an
  environment variable.

## What a good layout looks like

The well known `golang-standards/project-layout` repository is a list rather than a standard, and it includes directories
most projects do not need. Following it produces more structure than the code justifies, which is the failure mode to avoid
in the other direction.

The layout that works is the smallest one that expresses the boundaries:

- One module, unless there is a published library or a separately versioned binary.
- `cmd/<name>` for each program.
- `internal/<area>` for the code, one package per area, named for what it does.
- One public package at the root if there is a library to consume.
- A `Makefile` with `build`, `test`, `lint` and `run` targets.

Everything past that is a decision to make when a concrete problem demands it. The structure follows the boundaries, and the
boundaries follow the interfaces: a package is a boundary because something outside it depends on the interface rather than
the implementation.

## A Makefile as the entry point

```makefile
.PHONY: build test lint run

build:
	go build -o bin/app ./cmd/app

test:
	go test -race ./...

lint:
	gofmt -l .
	go vet ./...
	staticcheck ./...

run:
	go run ./cmd/app
```

A short `Makefile` gives a repository the four commands a new contributor needs, and it is the place the flags from the
toolchain chapter live: `-race` on the tests, `-trimpath` and `-s -w` on a release build, the version stamping. A
`go generate` and a `git diff --exit-code` pair belongs in the `lint` target, so a stale generated file fails the same
command as a formatting problem.

```makefile
release:
	CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=$(VERSION)" \
		-o dist/app ./cmd/app
```

That is the whole release process for a service, and having it in a file rather than in someone's shell history is what
makes a release reproducible.

## The rules

1. `cmd/<name>` for a program, `internal/<area>` for the code.
2. A package name says what it provides, and never `util`, `common` or `models`.
3. A type lives with its behaviour.
4. A shared type goes in a small package at the bottom of the graph.
5. The package comment and the doc comments are the documentation.
6. A `Makefile` names the four commands.

## Check yourself

Take a project with a `util` or `common` package and move one thing out of it into a package with a real name. Find an
import that should be `internal`, move the directory and confirm the compiler stops an outside import. Finish by writing the
package comment for one package and reading it back with `go doc`.
