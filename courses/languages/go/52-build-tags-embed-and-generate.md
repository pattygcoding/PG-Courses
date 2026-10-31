---
title: Build tags, embed and generate
summary: Code that is only compiled sometimes, files that go into the binary, and the tool that writes the rest.
chapter: Building and shipping
minutes: 13
status: draft
---

## A build tag selects what compiles

```go
//go:build linux && amd64

package platform
```

A `//go:build` line at the top of a file, followed by a blank line, decides whether that file is compiled. The expression
takes `&&`, `||`, `!` and parentheses, so `linux || darwin` is the Unix group and `!windows` is everything else.

Two rules catch people out:

- **The blank line is required.** Without it the comment is a comment and the file always compiles.
- **The file still needs a valid package clause.** A build-tagged file with no `package` line is a syntax error in the files
  that do compile.

The standard way to write a platform split is by file name rather than by tag:

```text
syscall_linux.go
syscall_windows.go
syscall_linux_amd64.go
syscall_unsupported.go
```

The go tool understands `_GOOS`, `_GOARCH` and `_GOOS_GOARCH` suffixes, so `syscall_linux.go` compiles on Linux and
`syscall_windows.go` on Windows with no tag at all. That is the convention to prefer for a platform split, and a build tag
is for everything else.

A custom tag is how a feature is compiled in or out:

```go
//go:build integration

package store

func TestAgainstRealDatabase(t *testing.T) { ... }
```

```bash
go test -tags integration ./...
```

That is the pattern for a test needing something the machine does not have: the file is not compiled unless the tag is given,
so `go test ./...` in a pipeline stays fast and `go test -tags integration` runs the slow set.

`//go:build ignore` is the other common one, and it means "this file is not part of any build", which is how a program used
with `go run` is kept out of the package:

```go
//go:build ignore

// A generator, run with: go run gen.go
package main
```

## The version tag

```go
//go:build go1.22

package compat
```

A version tag such as `go1.22` is true when the toolchain is at least that version, which is how a package supports two
implementations of something a newer release added. It is a compatibility mechanism for a library rather than something to
reach for in application code, where the `go` line in `go.mod` is the version floor and one implementation is enough.

## embed puts files in the binary

```go
//go:embed migrations/*.sql
var migrations embed.FS

//go:embed version.txt
var version string

//go:embed assets/*
var assets embed.FS
```

```go
data, err := migrations.ReadFile("migrations/001_init.sql")
```

`//go:embed` reads files or a directory into a variable at build time. A single file into a `string` or a `[]byte` is the
simple case; a directory into an `embed.FS` is the one that scales, and `embed.FS` satisfies `fs.FS` so a function taking an
`fs.FS` reads it with no change.

The pattern is relative to the file it appears in and it cannot reach outside the package directory, and it cannot match a
file whose name starts with `_` or `.` unless that file is named explicitly. `fs.Glob` and `fs.Sub` are the two functions
worth knowing for working with one:

```go
sub, err := fs.Sub(assets, "assets")
```

That gives a filesystem rooted at the subdirectory, which is how a handler serves an embedded directory without an `assets/`
prefix in every path.

The reason to embed rather than ship files: a binary with its templates, migrations and default configuration inside it has
nothing to keep in step, no working directory to get right, and no way to deploy the code without the data. The cost is that
changing a template is a rebuild, which for a file that changes often is the argument for the other option.

## go generate runs the tool that writes the code

```go
//go:generate stringer -type=Level
//go:generate mockgen -destination=mock_store.go -package=store . Store
//go:generate go run ./internal/gen/tables.go
```

```bash
go generate ./...
```

`go generate` scans for `//go:generate` directives and runs the commands. It is not part of `go build`, so generated code has
to be generated before a build that needs it, and the generated file is committed so a build on a machine without the
generator still works.

The rules that make it usable:

- **The directive goes in the file it affects**, next to the type it generates code for, so the two are edited together.
- **The command is explicit.** A `stringer` that is not on the PATH fails with a message, and
  `go run golang.org/x/tools/cmd/stringer@latest` is the version that pins it without an install.
- **The generated file says so at the top**, with a line naming the command, so a reviewer knows not to read it as source.
- **It is committed**, and a check for staleness is what keeps it honest.

```bash
go generate ./... && git diff --exit-code
```

That line is the check: if the generated files are out of date, the diff is non-empty and the build fails. It is the same
idea as the golden file's `-update` flag, applied to code.

## The generators worth knowing

| Tool | Generates |
| --- | --- |
| `stringer` | a `String` method for a defined integer type |
| `enumer` | a `String`, a JSON method and a validation for an enum |
| `mockgen` | a mock for an interface |
| `sqlc` | typed Go from SQL queries |
| `oapi-codegen` | a typed client and server from an OpenAPI document |
| `protoc-gen-go` | Go types from a protobuf definition |

`stringer` is the one to add first, because it replaces code this course already argued for by hand: the `String` method on a
`Level` type with a switch and a `default` arm. One directive and the method exists for every constant, including the ones
added later, which is the property that makes a generator worth its build step.

```go
type Level int

//go:generate stringer -type=Level

const (
	Quiet Level = iota
	Loud
)
```

## The rules

1. Prefer a file name suffix to a build tag for a platform split.
2. A blank line after `//go:build`, and one term per tag in the expression.
3. A custom tag for a test that needs a resource, so the default run stays fast.
4. `//go:embed` for templates, migrations and defaults, and take an `fs.FS` where they are used.
5. `go generate` with an explicit command, and the generated file committed.
6. `go generate ./... && git diff --exit-code` in the build.

## Check yourself

Write two files, one with `//go:build linux` and one named `_windows.go`, and confirm which compiles. Embed a directory with
`//go:embed` and read a file through an `fs.FS`, then add a `//go:generate` directive that runs `stringer` and check that
`go generate ./... && git diff --exit-code` is clean.
