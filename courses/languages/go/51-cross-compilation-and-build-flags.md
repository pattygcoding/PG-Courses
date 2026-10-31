---
title: Cross-compilation and build flags
summary: Building for another platform with no toolchain, stamping a version, and the two flags that halve a binary.
chapter: Building and shipping
minutes: 13
status: draft
---

## Cross-compilation is two environment variables

```bash
GOOS=linux GOARCH=arm64 go build -o app-linux-arm64 ./cmd/app
go tool dist list
```

That produces a Linux ARM64 binary on a Windows or Mac machine, with no cross-compiler and no container. The Go toolchain
contains every supported target's code generator, so `GOOS` and `GOARCH` are the whole configuration:

| GOOS | GOARCH | Target |
| --- | --- | --- |
| `linux` | `amd64` | a Linux server |
| `linux` | `arm64` | an ARM server or a 64-bit Raspberry Pi |
| `darwin` | `arm64` | an Apple Silicon Mac |
| `windows` | `amd64` | Windows |
| `js` | `wasm` | a browser, with a small runtime to load |

`go tool dist list` prints every pair the toolchain supports. A build that uses `os/exec`, a server, or anything
platform-specific compiles for the other platform and fails at run time, which is the limit of cross-compilation: it checks
the types and not the assumptions.

`GOOS` and `GOARCH` go in the environment rather than on the command line as flags, which is why a build script exports them
or a `Makefile` sets them for one target. `CGO_ENABLED=0` is worth adding for a static binary, and it is the default for a
package that does not import `net` or `os/user`.

## Stamping a version at link time

```go
var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)
```

```bash
go build -ldflags "-X main.version=1.2.3 -X main.commit=abc1234" -o app ./cmd/app
```

```text
1.2.3 abc1234 unknown
dev none unknown
```

`-X` sets a string variable at link time, and the name is the fully qualified `package.variable`. The defaults in the source
are what a plain `go build` produces, so a binary from a developer's machine says `dev` and a binary from the pipeline says
the tag. That is what makes `myapp --version` useful during an incident.

The values come from the build environment, so the pipeline passes what it knows:

```bash
go build -ldflags "-X main.version=$(git describe --tags --always) \
  -X main.commit=$(git rev-parse --short HEAD) \
  -X main.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" -o app ./cmd/app
```

`-X` works only on a `string` variable, and a variable of another type is ignored with no error. A `var version string` in
the `main` package is the convention, and a variable in another package works when the full import path is given.

## The two flags that halve the binary

```bash
go build -o app ./cmd/app
go build -ldflags "-s -w" -o app-stripped ./cmd/app
```

```text
ver-plain.exe: 2273 KB
ver-stripped.exe: 1550 KB
```

`-s` drops the symbol table and `-w` drops the DWARF debug information. Together they took a hello-world-sized binary from
2.27 MB to 1.55 MB, about a third. The cost is that a stack trace prints addresses instead of function names and a debugger
has no types, so the stripped build is for the artefact you ship rather than the one you debug.

Where the size matters: a container image, a CLI somebody downloads, a function billed by artefact size. Where it does not: a
server binary deployed once per release and never looked at.

Compression is the bigger win for a download, because a Go binary compresses well at roughly half its size. A release tool
does that automatically, so the stripped size is the floor rather than the number a user sees.

## The other build flags worth knowing

| Flag | Effect |
| --- | --- |
| `-trimpath` | removes the local paths from the binary |
| `-gcflags=-m` | prints the escape analysis decisions |
| `-race` | the race detector |
| `-tags` | build tags, which the next lesson covers |
| `-mod=vendor` | build from a `vendor` directory |
| `-buildvcs=false` | omit the version control information |
| `-C dir` | change to a directory before building |

```bash
go build -trimpath -o app ./cmd/app
```

`-trimpath` replaces the build machine's paths with the module path, which makes the binary reproducible across machines and
removes a username from the artefact. `go build` embeds version control information by default, which is what makes
`go version -m` useful:

```text
$ go version -m ./app
./app: go1.25.3
	path	example.com/app
	mod	example.com/app	(devel)
	build	-buildmode=exe
	build	-compiler=gc
	build	-ldflags="-s -w -X main.version=1.2.3"
	build	CGO_ENABLED=0
	build	GOARCH=amd64
	build	GOOS=linux
	build	vcs=git
	build	vcs.revision=ed6dc74c67808956ecadea265a2dfa6c9f2c1e0a
	build	vcs.time=2026-10-31T05:46:39Z
	build	vcs.modified=true
```

That output is a complete record of how a binary was built, including the linker flags it was given and whether the source
tree had uncommitted changes. It is worth reading before adding a version variable of your own: the commit is already there,
and the variable is for the value a user asks for by name.

## The escape analysis output

```bash
go build -gcflags=-m ./cmd/app
```

```text
./main.go:12:6: can inline makeRow
./main.go:14:9: &Row{...} escapes to heap
./main.go:20:10: new(Row) escapes to heap
```

`-gcflags=-m` prints what the compiler decided about each value: whether it stays on the stack or moves to the heap, whether
a function is inlined, whether a value is copied. An escape to the heap is an allocation, and whether that matters is the
profiling lesson's question. Reading the decision is worth doing once on a hot path rather than as a habit, because the output
is hundreds of lines for a small program.

## A release build

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -trimpath \
  -ldflags "-s -w -X main.version=$VERSION" \
  -o dist/app-linux-amd64 ./cmd/app
```

That is the build for a release script: a static binary for the target platform, no local paths, no debug information, and
the version stamped in. It is one command, and a `golang:1.25` container image is still the usual way to pin the toolchain in
a pipeline rather than relying on the developer's machine.

## Check yourself

Build the same program for `linux/amd64`, `darwin/arm64` and `windows/amd64` and compare the sizes. Stamp a version with
`-X` and read it back, then build with and without `-s -w` and check what `go version -m` reports for each.
