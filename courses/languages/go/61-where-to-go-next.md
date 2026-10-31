---
title: Where to go next
summary: What the other courses cover, the ecosystem outside the standard library, and the sources worth reading.
chapter: The ecosystem
minutes: 12
status: draft
---

## What this course covered

The language: types and zero values, slices and maps and the array they share, pointers, methods and the receiver decision,
interfaces and embedding, generics with constraints, errors as values, and the context that carries a cancellation.
Concurrency: goroutines, channels, `select`, the sync package, worker pools and the race detector. The standard library:
`io`, `encoding/json`, `time`, `net/http` as both a client and a server, and the template engine. And the practice: testing,
benchmarking, fuzzing, the linters, modules, cross-compilation, observability, and the patterns a service uses.

Two things were left as pointers rather than lessons: a database layer, because `database/sql` is a driver interface whose
shape depends on the database, and a web framework, because `net/http` is enough for a JSON API and a framework is a
dependency to add once the standard version is understood.

## What the other courses here cover

- **The JavaScript, TypeScript, Java and C# courses** cover the same ground for other ecosystems, which is the fastest way to
  see which decisions are Go's and which are universal. Generics, interfaces and errors look different in each, and the
  comparison is more useful than any single course's argument.
- **Rust** is the course to read after this one if the memory model is the interesting part. Go decided that a garbage
  collector buys simplicity and Rust decided it costs predictability, and reading both makes that trade concrete.
- **The SQL course** covers the query language a Go service spends its time sending.
- **Express, FastAPI, Spring Boot and .NET** are the framework equivalents for the hosts this course covered with the standard
  library. A Go service that outgrows `net/http` is the same shape of decision.

## The ecosystem outside the standard library

| Need | Package |
| --- | --- |
| A router beyond the mux | `chi`, `echo`, `gin` |
| A typed client and server | `grpc-go`, `connect-go` |
| Typed SQL | `sqlc`, `ent`, `bun` |
| Migrations | `golang-migrate`, `goose`, `atlas` |
| Validation | `go-playground/validator`, or a check in the handler |
| Metrics | `prometheus/client_golang` |
| Tracing | `go.opentelemetry.io/otel` |
| Test diffs | `google/go-cmp`, `stretchr/testify` |
| Errors with a stack | `cockroachdb/errors` |
| Concurrency groups | `golang.org/x/sync/errgroup`, `semaphore` |
| Structured logging | `log/slog`, in the standard library |

The shortest list worth adding to a service is `errgroup` for a bounded group of goroutines, `prometheus/client_golang` for
metrics and something for migrations. Everything else can wait until it is needed.

`golang.org/x/...` packages are the ones the Go team maintains outside the standard library: `sync`, `text`, `net`, `tools`,
`vuln`. They are held to a high standard and used by the standard library itself, which makes them the first place to look for
something the standard library does not have.

## Reading the sources

- **`go.dev/doc/effective_go`** for the idioms, which reads differently after writing some Go.
- **The Go blog** for the design essays: the scheduler, the garbage collector, the memory model, `slog`.
- **The release notes for each version** are short and they are where a change to the language is explained. Reading them
  before an upgrade is how a surprise is avoided.
- **`$GOROOT/src`** for the standard library, which is ordinary Go and commented for `go doc`.
- **`pkg.go.dev`** for the documentation of anything, including its source and its call graph.
- **The Go specification** is short for a language specification and is the answer to a question about the language rather
  than about a library.

Two specific things worth reading in the source: `net/http`'s `server.go` for how a request is handled, and `sync/atomic` or
`internal/sync` for what a lock costs. Both are the kind of code a Go programmer should be able to write.

## Practice

- **Read `$GOROOT/src/strings` and rewrite one function from its documentation.** It is a lesson in the standard library's own
  style.
- **Write a small service with the standard library only**: a JSON API, a database, tests with `httptest`, a graceful
  shutdown. Then add a framework and see what it saves.
- **Take an interface with eight methods and replace it with two small ones.**
- **Find a goroutine leak** with `runtime.NumGoroutine` or `goleak`, and fix it with a context.
- **Benchmark something you believe is slow**, and be prepared for the answer to be the JSON encoding and not the loop.
- **Write a fuzz target for a parser**, which is twenty lines and finds bugs the tests never will.

## The advice I would give

1. **The standard library is the framework.** Learn `net/http`, `encoding/json`, `io` and `testing` properly before adding a
   package, because a Go codebase with a small dependency list is easier to keep working.
2. **Errors are values and they need context.** Wrap with `%w`, check with `errors.Is`, and log once at the boundary.
3. **A context as the first parameter of anything that blocks**, cancelled from one place.
4. **Bound the concurrency.** A goroutine per item is a decision about how many can be in flight, and the answer is a number
   tied to a real limit.
5. **Run `go test -race ./...` in the build.** A race in production is a crash nobody can reproduce.
6. **Write the test before the abstraction.** The difficulty of the test is information about the design.
7. **Measure before optimising and measure again after.** The profile knows which line and the benchmark knows whether the
   change helped.

The last one is the habit I would keep if I could keep one, because it applies to everything else on the list: `go test`,
`go vet`, the race detector and the profiler are one toolchain, and a language whose toolchain answers those questions is a
language where the answers are cheap.

The thing that took me longest to learn is the one the first lesson opened with. Go's simplicity is not an absence of
features; it is a decision that a reader's time is the scarce resource. The language has no inheritance because a reader
chases one less indirection. It has no exceptions because a reader sees the failure path. It has one loop keyword because
there is nothing to look up. Every feature this course argued for or against is worth judging by that standard.

## Check yourself

Pick one thing from this course you have not used, spend an hour on it and write down what it was for. Then take a program
you have written and run `go vet`, `staticcheck`, `go test -race` and `go test -bench . -benchmem` on it, and read the four
sets of output.
