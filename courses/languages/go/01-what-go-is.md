---
title: What Go is
summary: A small language with a large standard library, and the four design decisions that follow from it.
chapter: Getting started
minutes: 13
status: draft
---

## The language fits in your head

```go
package main

import "fmt"

func main() {
	name := "go"
	fmt.Println("hello from", name)
}
```

```text
hello from go
```

There is no class, no `extends`, no `try`, no `while`, and no ternary operator. Go has about twenty-five keywords, and
you can read the whole list in a minute. `:=` declares a variable and infers its type, `func` starts a function whether it
belongs to a type or not, and a package is a directory.

That is the first thing to know, because it changes how the language is learned. Most of this course is not syntax. It is
the handful of decisions that every Go program makes the same way:

- **Errors are returned values.** A function that can fail returns an `error` alongside its result, and the caller checks
  it. There is no exception to catch and no stack to unwind.
- **Interfaces are satisfied implicitly.** A type satisfies an interface by having the methods, with nothing declared and
  no import for the contract.
- **Concurrency is part of the language.** `go f()` starts a goroutine, and a channel is a typed value that two of them
  can pass data through.
- **The tool is part of the language.** `go build`, `go test`, `go vet`, `go fmt` and `go doc` all ship in the one `go`
  binary, and the canonical formatting is defined by `gofmt` rather than by a style guide.

## One binary out

```bash
go build -o app.exe .
./app.exe one two
```

```text
hello from go 1.25 [one two]
```

That produced a single executable with no runtime to install on the target. A Go program that uses the standard library
does not need a Go toolchain on the machine that runs it, which is why Go is a common choice for a command line tool that
somebody has to install on a machine you do not control.

The binary is not small by the standards of a C program, because the runtime and the garbage collector are linked into it,
and the standard library is large. It is small enough and it starts in milliseconds, which matters more for a service that
scales by process than for one that scales by thread.

## The standard library is the framework

```go
import (
	"encoding/json"
	"net/http"
)
```

An HTTP server with a JSON API is about forty lines of standard library code, with no dependency to add. The pieces a
service actually needs are all there: `net/http`, `encoding/json`, `crypto/tls`, `log/slog`, `time`, `context`,
`database/sql` with a driver, `testing`, and `net/http/pprof` for profiling a running server.

That is a deliberate difference from most ecosystems. A Node or Python project starts by choosing a framework and a
handful of libraries; a Go project starts with the standard library and adds a dependency when the standard library's
version is genuinely not enough. The HTTP chapter of this course is that standard library, not a framework.

## What Go deliberately does not have

| Missing | Effect |
| --- | --- |
| Inheritance | composition through embedding, so no fragile base class |
| Exceptions | every failure is a returned value, so a caller has to think about it |
| Optional parameters | an options struct or functional options |
| Operator overloading | arithmetic looks like arithmetic |
| Sum types | an interface with an unexported method, or a struct with a kind field |
| Exhaustive `switch` checking | a `switch` over an enum does not warn about a missing case |

The last row is the one I notice most. A closed set of values is expressed as a defined type with constants, and nothing
makes a `switch` handle every one of them, so adding a case later is a search rather than a compile error.

## The cost of simplicity

Go's error handling is the most discussed trade in the language. A function that calls four fallible things has four
`if err != nil` blocks, and there is no sugar for it. The argument for it is that the failure path is written where the
failure happens, the `error` carries context by wrapping, and a reader sees which calls can fail without checking a
signature's `throws` clause. The argument against is that the blocks are repetitive and easy to get wrong by returning a
bare `nil` where an `err` was meant.

My position after writing a lot of both: the repetition is real, it is smaller than it looks once error wrapping is
habitual, and the ability to read a function and see every failure it handles is worth more than the lines saved.

## Where the language came from

Go was designed at Google for the problems Google had: large codebases, a slow build, and engineers moving between
services. The goals were fast compilation, a simple language that a new engineer could read on the first day, built-in
concurrency for a world of network servers, and no dependency on a runtime that is not shipped with the binary.

Almost every unusual decision in the language follows from one of those four. Fast compilation is why there is no
inheritance and why an unused variable is an error rather than a warning. Readability is why there is one loop keyword and
why `gofmt` has no options. Concurrency is why `go` is a keyword. The single binary is why the standard library is as
large as it is.

## Check yourself

Install Go and run a hello program with `go run .`. Then read the output of `go help` and count the commands, and look up
one package you would expect to need a library for, such as JSON encoding, in `go doc encoding/json`.
