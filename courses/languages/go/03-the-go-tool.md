---
title: The go tool
summary: Build, test, vet, format and document from one binary, and the errors the compiler refuses to ignore.
chapter: Getting started
minutes: 13
status: draft
---

## One binary, many commands

```bash
go help
```

```text
The commands are:

        bug         start a bug report
        build       compile packages and dependencies
        clean       remove object files and cached files
        doc         show documentation for package or symbol
        env         print Go environment information
        fix         update packages to use new APIs
        fmt         gofmt (reformat) package sources
        generate    generate Go files by processing source
        get         add dependencies to current module and install them
        install     compile and install packages and dependencies
        list        list packages or modules
        mod         module maintenance
        work        workspace maintenance
        run         compile and run Go program
        test        test packages
        tool        run specified go tool
        version     print Go version
        vet         report likely mistakes in packages
```

There is no separate compiler, linker, formatter, linter, test runner or documentation tool. That is a design decision with
a practical effect: the tool knows about the language, so `go test` understands test files and `go vet` understands
`fmt.Printf` format strings. A project's toolchain is the `go` command plus whatever you choose to add, and a new machine
needs one install.

## The compiler refuses more than other compilers

```go
package main

import "fmt"

func main() {
	x := 1
	fmt.Println("hi")
}
```

```text
unused\main.go:6:2: declared and not used: x
```

And for an import that was left behind:

```text
main.go:5:1: "os" imported and not used
```

Both are errors rather than warnings, which is unusual and deliberate. An unused variable usually means the code does not
do what the author thought, and an unused import is usually the leftover of an edit. There is no warning level in Go and
no way to turn either rule off, so both are absolute: every declared variable is used and every import is referenced.

The escape hatch is the blank identifier, which is how you accept a value you do not use:

```go
func handler(event string, _ context.Context) error {
	return nil
}
```

## gofmt has no options

```bash
gofmt -l .
gofmt -w .
```

The first lists the files that are not canonically formatted and the second rewrites them. Indentation is tabs, the opening
brace goes on the same line, and the alignment of a struct's fields or of a trailing comment is computed rather than
chosen. There is nothing to configure, so every Go codebase is formatted the same way and a diff never contains a debate
about whitespace.

```bash
go fmt ./...
```

`go fmt` is a wrapper that runs `gofmt -l -w` over the packages you name, so it is the version to use for a whole module.
It takes a package pattern rather than a directory, and `./...` means every package under the current directory.

The editor integration matters more than either command: format on save is one setting in any Go editor, and after that you
stop thinking about formatting.

## go vet finds the mistakes the compiler allows

```go
fmt.Printf("%s\n", strings.ToUpper(name))
fmt.Printf("%d\n", "wrong type")
```

```text
bad\main.go:13:14: fmt.Printf format %d has arg "wrong type" of wrong type string
```

That program compiles, because `Printf` takes `...any`. `go vet` reads the format string and the arguments and reports the
mismatch, which is a class of bug the compiler cannot see. The same tool catches a missing argument:

```text
.\vetcases.go:6:13: fmt.Printf format %s reads arg #1, but call has 0 args
```

`go vet` runs a fixed set of analyses: the format checks, a struct copy that contains a lock, a `context` whose cancel
function is never called, unreachable code, and a few more. It is part of a release's compatibility promise, so its
findings are reliable enough to fail a build, and it is fast.

```bash
go vet ./...
```

That is the command to put in a build. A project that has run it from the start has no backlog of findings, which is the
state worth keeping.

## go doc

```bash
go doc fmt
```

```text
package fmt // import "fmt"

Package fmt implements formatted I/O with functions analogous to C's printf and
scanf. The format 'verbs' are derived from C's but are simpler.

# Printing
```

`go doc` prints the documentation for a package or a symbol, formatted from the comments in the source. `go doc
strings.Builder` prints that type and its methods, and `go doc -all strings` prints everything the package exports. It
reads the source on disk, so it works with no network and describes exactly the version installed.

The documentation it prints follows one convention: a comment directly above a declaration becomes that declaration's
documentation, and the first word is usually the name of the thing. That convention is why `go doc` output looks the same
across every Go package, and the lesson on writing a package covers it properly.

## The commands worth knowing by habit

| Command | For |
| --- | --- |
| `go run .` | the edit and run loop |
| `go build ./...` | checking that everything compiles |
| `go test ./...` | the test suite |
| `go vet ./...` | the analyses the compiler does not run |
| `gofmt -l .` | finding files that are not formatted |
| `go mod tidy` | fixing the dependency list after an import change |
| `go list ./...` | listing which packages a pattern matched |
| `go doc <symbol>` | reading documentation offline |
| `go env -w KEY=value` | setting a persistent tool setting |

`go list ./...` is the one I use to answer a question about a pattern. When `./...` does not match what I expect, or a
package is part of the build when it should not be, `go list` names what was matched.

```bash
go env -w GOFLAGS=-trimpath
go env -u GOFLAGS
```

`go env -w` writes a setting to the user's own environment file so it survives a new shell, which is how to set `GOFLAGS`,
`GOPRIVATE` or `GOPROXY` without editing a shell profile. `go env -u` removes it. The setting is not part of the project
and does not travel with the source, which is the thing to remember about it.

## Check yourself

Run `go help` and find the commands you did not know. Then write a program with an unused variable and an unused import and
read both errors, fix them, and add a mismatched `Printf` format to see what `go vet` says. Finally run `gofmt -l` on a
file you have not formatted.
