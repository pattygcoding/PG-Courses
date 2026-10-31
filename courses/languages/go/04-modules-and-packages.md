---
title: Modules and packages
summary: The module file, the import path, and the three errors that teach Go's visibility rules.
chapter: Getting started
minutes: 13
status: draft
---

## A module is a directory with a go.mod

```bash
go mod init example.com/tmpgo
```

```text
module example.com/tmpgo

go 1.25.3
```

`go mod init` writes the module's path and the language version. The path is what other code imports this module as, and it
does not have to be a URL that resolves: `example.com/tmpgo` is conventional for a module that will never be published, and
a real module uses the repository path so that `go get` can find it.

A module is the unit of versioning and of dependency resolution. Everything under the directory holding `go.mod` is part of
it, and a nested directory with its own `go.mod` is a separate module.

## A package is a directory

```go
package main

import (
	"fmt"

	"example.com/tmpgo/internal/widget"
)
```

The import path is the module path plus the directory, and the package name is what the `package` clause says. Those two
can differ, and the import path is what the compiler resolves:

```text
example.com/tmpgo/internal/widget   ->  the directory, and the import path
widget                              ->  the package name, and what you write as widget.New
```

By convention they are the same, and a directory named `widget` holding `package widgets` is a mistake people notice only
because they have to write the name twice in different forms. The exceptions are a `main` package in a directory named
anything, and a versioned package such as `gopkg.in/yaml.v3` whose name is `yaml`.

## Exported means capitalised

```go
package widget

// New returns a widget.
func New(name string) Widget {
	return Widget{name: name}
}

// Widget is a widget.
type Widget struct {
	name  string
	Count int
}

func (w Widget) Label() string {
	return "widget " + w.name
}
```

From another package, `widget.New`, `widget.Widget` and `w.Count` are reachable and `w.name` is not:

```text
w.name undefined (cannot refer to unexported field name)
```

That is the whole visibility system. A capital letter means exported and a lowercase letter means private to the package,
and it applies to types, functions, methods, struct fields, constants and interface methods. There is no `private` keyword
and no separate file-level scope, so a package is the unit of encapsulation in Go, which is one of the reasons packages are
kept small.

A method named `label` on an exported type is unexported too, so a value of that type cannot be used through that method
from outside, and an interface with an unexported method can only be satisfied by a type in the same package. That last
fact is how Go seals an interface deliberately.

## internal is the one path rule

```go
import "example.com/tmpgo/proj/internal/secret"
```

```text
other\main.go:6:2: use of internal package example.com/tmpgo/proj/internal/secret not allowed
```

A directory named `internal` limits what can import it: only code inside the directory above `internal` may. In the example
above, `internal` sits inside `proj`, so packages under `proj` can import `secret` and a package outside `proj` cannot.

That is the tool for the API you want the repository to use but not a consumer, and it is enforced by the compiler rather
than by a comment. A module's root `internal/` directory is importable from anywhere in that module and nowhere else,
which is the usual place for the parts of a service that are not its public surface.

## Import cycles are rejected

```text
package example.com/tmpgo/cycle/a
        imports example.com/tmpgo/cycle/b from a.go
        imports example.com/tmpgo/cycle/a from b.go: import cycle not allowed
```

The compiler prints the whole chain, which is the useful part: it shows you the shortest path around the loop. Two packages
that need each other are a sign that something belongs in a third package that both can import, and the fix is usually to
move the shared type or interface down rather than to merge the packages.

The rule is what makes a `package` a unit of compilation with no ordering problem, and it is why a small, dependency-free
`internal/model` package is a common shape in a Go repository.

## The rest of the module file

```text
module example.com/report

go 1.25.3

require golang.org/x/text v0.30.0

replace golang.org/x/text => ../text

toolchain go1.26.0
```

`require` lists a dependency and the minimum version needed, which is what the build uses unless something else demands a
newer one. `replace` points a module at another location, which is how a fork or a local checkout is used during
development, and it is the directive to remove before publishing. `toolchain` pins a toolchain newer than the `go` line.

`go.sum` holds a hash of every module version the build used, and it is what makes a build reproducible: a dependency whose
content changed under the same version is a checksum failure rather than a silent substitution. Both files are committed,
and `go mod tidy` is what keeps the list honest after an import is added or removed.

```text
golang.org/x/text v0.43.0 h1:1QivrlhwAsnMOcqgOdl9my7s9OyZl8O5/UGUTJVXoWc=
golang.org/x/text v0.43.0/go.mod h1:hbSIYA/amXcRXTFSZqh8tWHEoqRvvbKPJ2uz/KU+a+s=
```

There are two lines per version: the hash of the module's content and the hash of its `go.mod`. A `// indirect` comment on
a `require` line means nothing in this module imports the dependency directly, which happens when a dependency needs it or
when a `go get` added it before any code used it.

```bash
go mod tidy
go mod download
go mod vendor
```

`tidy` adds what is missing and removes what is unused. `download` fills the module cache without building. `vendor` copies
the dependencies into the repository, which some organisations require for a build with no network access, at the cost of a
large diff on every dependency change.

## The toolchain downloads itself

```bash
go get golang.org/x/text@latest
```

```text
go: downloading golang.org/x/text v0.43.0
go: golang.org/x/text@v0.43.0 requires go >= 1.26.0; switching to go1.26.10
go: downloading go1.26.10 (windows/amd64)
go: upgraded go 1.25.3 => 1.26.0
go: added golang.org/x/text v0.43.0
```

That is the toolchain line from the previous lesson doing its job. The dependency needed a newer Go than the one installed,
so the `go` command downloaded that version, used it, and raised the `go` line in the module file to record what happened.

It is convenient and it is worth knowing about before it surprises you: a `go get` on a machine with an older toolchain can
download a whole second toolchain and edit your `go.mod`. The command that makes it explicit is `go get -u toolchain`, and
`GOTOOLCHAIN=local` refuses the download entirely, which is what a build container that must stay offline uses.

## Check yourself

Create a module, add a package under it with one exported and one unexported field, and use both from a `main` package to
read the two results. Then add an `internal` directory and import it from outside its subtree, and finally make two
packages import each other to read the cycle error.
