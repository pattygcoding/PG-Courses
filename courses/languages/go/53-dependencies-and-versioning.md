---
title: Dependencies and versioning
summary: Minimum version selection, the go.sum file, and what an upgrade actually does.
chapter: Building and shipping
minutes: 13
status: draft
---

## The module graph and minimum version selection

```text
module example.com/app

go 1.25.3

require (
	github.com/google/go-cmp v0.6.0
	golang.org/x/text v0.43.0
)

require golang.org/x/sys v0.28.0 // indirect
```

`require` lists a dependency and the **minimum** version the module needs, not the version that is used. Go's resolver takes
the maximum of the minimums across the graph, which is a design decision worth understanding:

- If A needs `x v1.2.0` and B needs `x v1.4.0`, the build uses `v1.4.0`.
- No dependency can force a version down, so an old library cannot downgrade a newer one.
- Nothing needs a lock file with resolved versions, because the resolution is a function of the requirements.

That is minimum version selection, and it is why `go.mod` is short and reviewable rather than a thousand-line lock file. The
`// indirect` comment marks a dependency nothing in this module imports directly, which happens when a dependency needs it or
when a `go get` added it before any code used it.

## go.sum is a checksum list

```text
golang.org/x/text v0.43.0 h1:1QivrlhwAsnMOcqgOdl9my7s9OyZl8O5/UGUTJVXoWc=
golang.org/x/text v0.43.0/go.mod h1:hbSIYA/amXcRXTFSZqh8tWHEoqRvvbKPJ2uz/KU+a+s=
```

Two lines per version: the hash of the module's content and the hash of its `go.mod`. A dependency whose content changes
under the same version is a checksum failure rather than a silent substitution, which is what makes a Go build reproducible
with no lock file.

`go.sum` is committed, and it is not a lock: the versions come from `go.mod`, and `go.sum` is the proof that the bytes are
what the version claims. A missing entry is an error and a changed entry is an error, and neither can be waved away with a
flag.

## Adding, upgrading and removing

| Command | Effect |
| --- | --- |
| `go get pkg@version` | add or change one dependency |
| `go get -u ./...` | upgrade the dependencies of this module |
| `go mod tidy` | add what is missing and remove what is unused |
| `go mod download` | fill the cache without building |
| `go mod verify` | check the cache against `go.sum` |
| `go clean -modcache` | empty the cache, forcing a re-download |

`go mod tidy` is the command to run after any import change, and it is worth running before a release, because a dependency
needed only by a test on one platform can leave a requirement behind after the test is deleted.

`go get -u ./...` upgrades every dependency to its latest minor or patch version, which is a large change in one commit. I
upgrade one dependency at a time when the change is interesting and everything at once when the project is small, and either
way with the tests run afterwards.

## The toolchain upgrade trap

```text
go: golang.org/x/text@v0.43.0 requires go >= 1.26.0; switching to go1.26.10
go: downloading go1.26.10 (windows/amd64)
go: upgraded go 1.25.3 => 1.26.0
go: added golang.org/x/text v0.43.0
```

A newer dependency can require a newer Go than the one installed, and `GOTOOLCHAIN=auto` then downloads a whole second
toolchain and raises the `go` line in the module. That is convenient and worth watching: an upgrade can change the language
version of a module as a side effect, and a `go 1.26.0` line means every developer and every pipeline needs 1.26 or a
download.

```bash
GOFLAGS=-mod=readonly go build ./...
```

`-mod=readonly` makes an out-of-date `go.mod` an error rather than an edit, which is what a pipeline wants: a missing
requirement fails the build instead of being added silently, so the `go.mod` change has to be a deliberate commit.

## Vendoring

```bash
go mod vendor
```

That copies every dependency into a `vendor` directory, and any build in that module then uses the copies. The reasons to do
it: a build with no network access, a review of exactly what is compiled, and an organisation that requires the source of
everything it ships. The cost is a large diff on every dependency change, a repository several times the size, and a
`vendor` directory that is easy to forget to update.

```bash
go mod vendor && git diff --exit-code -- vendor
```

That is the staleness check for a vendored module, and it belongs in the pipeline: a vendored dependency that no longer
matches `go.mod` produces a build that does not match the source.

## Vulnerabilities

```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

```text
Vulnerability #1: GO-2024-1234
    A crafted input can cause excessive memory use in example.com/thing
  More info: https://pkg.go.dev/vuln/GO-2024-1234
  Module: example.com/thing
    Found in: example.com/thing@v1.2.0
    Fixed in: example.com/thing@v1.2.1
    Example traces found:
      #1: handler.go:42:22: http.HandlerFunc.ServeHTTP
```

`govulncheck` reads the Go vulnerability database and reports the vulnerabilities the **code actually reaches**, using call
graph analysis rather than a list of modules. That is the difference from a scanner that reports every dependency with a
known issue: a problem in a function this program never calls is reported as not reachable, which is what makes the output
actionable rather than a list to ignore.

`govulncheck -mode=source ./...` is the version for a scheduled build, and the field to read first in a report is `Fixed in`,
because that is the version to upgrade to.

## What a dependency costs

A dependency is code you did not write, that you will be asked to upgrade, and that somebody else can abandon. The questions
worth asking before adding one:

- **How much of it do I use?** A library for one function is a function to copy or to write.
- **Does the standard library do it now?** `slices`, `maps`, `cmp`, `log/slog` and `errors.Join` replaced several popular
  packages.
- **Is it maintained?** The commit date and the open issue count are on the module page.
- **How many modules does it bring with it?** A transitive tree of twenty is a decision rather than a detail.
- **Is the licence acceptable?** `go-licenses` or `go list -m -json all` lists them.

The Go norm is a small dependency list, and the reason is that the standard library covers what other ecosystems reach for a
package to get. A module with four requires is normal; one with forty is worth a conversation.

## The version format

```text
v0.5.0                  // an unstable module, no compatibility promise
v1.4.2                  // a stable module, semver
v2.0.0+incompatible     // a module that broke compatibility without changing its path
example.com/m/v2 v2.1.0 // the correct way to publish a v2
gopkg.in/yaml.v3 v3.0.1 // a legacy path convention
```

A module at v2 or above has to include the major version in its **path**, which is why so few Go modules reach v2: the path
change is a rename, and the alternative is a `+incompatible` tag that opts out of the promise. A `v0.x` module has no
compatibility promise at all, which is why a project often pins one and reviews each upgrade.

`go list -m -u all` reports the available upgrades for the whole graph, which is the command to run before deciding what to
update:

```text
github.com/google/go-cmp v0.6.0 [v0.7.0]
golang.org/x/text v0.43.0 [v0.44.0]
```

The bracketed version is what is available. A `[v0.44.0]` on a `v0.x` dependency is a change with no promise behind it, and
the release notes are worth reading rather than assuming.

## Check yourself

Add a dependency, read the `go.mod` change and the two `go.sum` lines it produced, then remove the import, run `go mod tidy`
and confirm both files shrink. Run `go mod verify` and `govulncheck ./...`, then decide whether one dependency could be
replaced by the standard library.
