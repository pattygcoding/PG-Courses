---
title: Installing and running
summary: The toolchain, the two directories it owns, and the difference between go run and go build.
chapter: Getting started
minutes: 12
status: draft
---

## Install the toolchain

```bash
go version
```

```text
go version go1.25.3 windows/amd64
```

The download from `go.dev/dl` is a single archive with the compiler, the standard library's source and the `go` command
in it. On Linux, `apt install golang-go` or a distribution package gives an older version, so the archive or a version
manager is the usual choice on a machine where the Go version matters. macOS has an installer, and Windows has an `.msi`.

Go's own tooling manages the version once one is installed, which is the next section.

## Two directories

```bash
go env GOPATH GOMODCACHE GOCACHE
```

```text
C:\Users\patty\go
C:\Users\patty\go\pkg\mod
C:\Users\patty\AppData\Local\go-build
```

`GOPATH` is the base directory for the Go workspace, and `GOMODCACHE` is where downloaded module versions are stored, by
default under it. Neither holds your source any more: since modules, a project lives wherever you put it, and the
directory it is in is unrelated to how it is imported.

`GOCACHE` is the build cache, and it is the reason a second `go build` of an unchanged program takes almost no time. It is
safe to delete, and `go clean -cache` does that deliberately when a build is behaving strangely, at the cost of a slow
next build.

## A program in two commands

```bash
go mod init example.com/hello
go run .
```

```text
hello from go 1.25 []
```

`go mod init` writes a `go.mod` file that names the module, and `go run .` compiles the package in the current directory
and runs it. `go run` leaves no binary anywhere: it compiles into the build cache, runs the result and deletes nothing
visible.

```bash
go build -o app.exe .
./app.exe one two
```

```text
hello from go 1.25 [one two]
```

`go build` writes the binary, `-o` names it, and the `.` is the package to build. Without `-o`, the binary is named after
the directory the package is in, or after the module's last path element for the main package at the root of a module.

A command line program passes its arguments through `os.Args`, where the first element is the program's own path and the
rest are the arguments:

```go
func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: app <name>")
		os.Exit(2)
	}

	fmt.Println("hello", os.Args[1])
}
```

```text
usage: app <name>
exit status 2
```

Note the last line. `os.Exit(2)` ends the program with that status, and `go run` prints `exit status 2` to tell you the
program failed before exiting itself with a non-zero status. The convention for exit codes is `0` for success, `1` for a
general failure and `2` for a usage error, which is worth keeping to because a script that checks the code cannot tell
which failure happened otherwise.

## go run and go build are not the same thing

| Command | Compiles | Writes a binary | Use for |
| --- | --- | --- | --- |
| `go run .` | yes | no | the edit and run loop |
| `go build .` | yes | yes | building the artefact to test by hand |
| `go build -o /dev/null .` | yes | no | checking that it compiles in a script |
| `go vet ./...` | partial | no | the checks the compiler does not do |

`go run` is a convenience wrapper and it is slower than it looks on a cold cache, because it compiles the whole dependency
graph every time. For a small program that is milliseconds. For a large one, `go build` once and run the binary, which is
what a `Makefile` or a task runner does.

## The toolchain line in go.mod

```text
module example.com/hello

go 1.25.3
```

The `go` line is the language version the module is written against, and it decides which language features are accepted
rather than which toolchain runs. A module with `go 1.21` cannot use the 1.22 loop variable semantics, and it is the
setting to change deliberately rather than incidentally.

```bash
go env GOTOOLCHAIN
```

```text
auto
```

With `GOTOOLCHAIN=auto`, which is the default, a go.mod that asks for a newer version than the one installed makes the
`go` command download that version and use it. That is how a project pins its toolchain: the version in `go.mod` is the
contract, and a developer with an older Go gets the right one automatically. Setting `GOTOOLCHAIN=local` forbids the
download, which is what a locked-down build machine uses.

A `toolchain go1.26.0` line pins a version newer than the `go` line, which is the way to say "this module is written for
1.25 and CI should use 1.26".

## Upgrading the toolchain

```bash
go install golang.org/dl/go1.26.0@latest
go1.26.0 download
```

That installs a specific version beside the one you have, which is how to check that a project builds on a release
candidate without disturbing your main toolchain. `go install` with an `@version` is the general way to install a tool
into `GOBIN`, and it has an important property: the tool is built from source in module mode, so the version is pinned in
the command rather than in a package manager's index.

## Check yourself

Install Go, run `go env GOPATH GOMODCACHE`, and find the two directories. Then write a program that prints `os.Args`,
build it, run it with two arguments, and compare the output with `go run . one two`. Finally delete the build cache and
time both commands again.
