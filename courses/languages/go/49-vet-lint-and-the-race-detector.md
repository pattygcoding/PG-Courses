---
title: vet, lint and the race detector
summary: The checks between the compiler and the tests, and what each one is for.
chapter: Testing and tooling
minutes: 13
status: draft
---

## vet is the compiler's second opinion

```bash
go vet ./...
```

`go vet` runs a fixed set of analyses that the compiler does not, and its findings are reliable enough to fail a build. The
checks worth knowing by name:

| Check | Catches |
| --- | --- |
| `printf` | a format string that does not match its arguments |
| `stringintconv` | `string(int)` producing a character rather than digits |
| `copylocks` | a struct containing a mutex being copied |
| `lostcancel` | a cancel function that is not called on every path |
| `composites` | an unkeyed literal of a struct from another package |
| `unusedresult` | a result that is probably meant to be used |
| `tests` | a mistake in a test file, such as a `Fatal` in a goroutine |
| `unreachable` | code after a `return` |
| `structtag` | a malformed struct tag |
| `shadow` | a shadowed variable, which is not enabled by default |

```go
fmt.Printf("%d\n", "wrong type")
```

```text
bad\main.go:13:14: fmt.Printf format %d has arg "wrong type" of wrong type string
```

The `tests` check is worth knowing because it catches a mistake that otherwise produces a confusing failure:

```text
call to (*testing.T).Fatal from a non-test goroutine
```

A `t.Fatal` in a goroutine the test started either panics or passes silently depending on the version, and the rule is
`t.Error` from a goroutine and `t.Fatal` only from the test's own goroutine. A channel or a `WaitGroup` is how the goroutine
reports back to the test.

`go vet` is part of the release's compatibility promise, so a new check appears with a new Go version and a project
upgrading can suddenly have findings. That is one reason to pin the toolchain, and the fix is a small change rather than a
suppression, because a check cannot be turned off in place.

## The race detector in the test run

```bash
go test -race ./...
```

That is the command for a build, and the concurrency chapter covers the report. Two things about it in a test suite: it is
several times slower and uses much more memory, so a suite that takes ten seconds can take two minutes; and it only finds a
race that the tests exercise, so a path with no test is not covered.

The trade is worth taking in continuous integration and optional locally. The arrangement I use is a `make test-race` target
for the local run and the race version in the pipeline, because a race that reaches production is a crash that cannot be
reproduced.

## Staticcheck

```bash
go install honnef.co/go/tools/cmd/staticcheck@latest
staticcheck ./...
```

`staticcheck` is the external linter most Go projects add. It is a superset of `vet`'s checks plus several hundred more, and
the ones that find real bugs are worth knowing:

| Check | Catches |
| --- | --- |
| `SA4006` | a value assigned and never used |
| `SA5000` | an assignment to a nil map |
| `SA5011` | a possible nil pointer dereference |
| `SA9003` | an empty branch |
| `S1000` | a select with one case, which should be a plain receive |
| `ST1005` | an error string with a capital letter or a full stop |
| `QF1001` | a De Morgan simplification |

`SA5011` is the one that pays for the tool: it follows a nil check and reports a dereference the check does not cover, which
is the bug `go vet` misses and a reviewer will not see.

`staticcheck -explain SA5011` prints the rationale for one check, which is the command to reach for when a finding looks
wrong. Suppressing is `//lint:ignore SA5011 the pointer is set by init` on the line before, and a suppression with no reason
is a finding somebody disabled rather than understood.

## golangci-lint runs them together

```yaml
# .golangci.yml
linters:
  enable:
    - errcheck
    - govet
    - ineffassign
    - staticcheck
    - unused
    - misspell
    - revive
```

```bash
golangci-lint run ./...
```

`golangci-lint` runs several linters in one pass and caches the result, which is worth it for a project with more than two.
The linters to enable at the start are the ones above: `errcheck` for an unchecked error, `govet` for the standard checks,
`ineffassign` for a pointless assignment, `staticcheck` for the bug-finding set and `unused` for dead code.

`revive` is the modern replacement for `golint` and it covers the style rules: an exported symbol with no comment, an
inconsistent receiver name, an error string starting with a capital. That last one is a rule from this course's own error
lessons, enforced by a tool rather than by a reviewer.

The temptation with a linter configuration is to enable everything. The cost is a backlog of findings nobody agrees with and
a rule that is disabled the first time it blocks a merge. Enabling the list above and adding one at a time is the version
that survives.

## What is not worth a linter

- **Formatting.** `gofmt` does it and no linter should be involved.
- **A rule the compiler already enforces.** An unused variable is a compile error, so a linter rule for it is noise.
- **A rule about a line's length.** That is a formatter's job, and `gofmt` declines to do it.
- **A rule that fights the language's conventions.** A naming rule that dislikes initialisms produces `Id` and `Url`.

## The order in a build

```bash
gofmt -l .
go vet ./...
staticcheck ./...
go test -race ./...
```

Formatting first, because it is instant and a diff of whitespace hides everything else. Then `vet`, then the linter, then
the tests with the race detector. Each step is more expensive than the one before, which is the order that fails fastest.

## Check yourself

Introduce a mismatched `Printf`, a copied mutex and a `string(int)` conversion and read the three `go vet` messages. Run
`staticcheck` on the same package and compare the findings, then add `golangci-lint` with the linters above and read what it
reports that the others did not.
