---
title: Packaging and publishing a crate
summary: The metadata a release needs, what a version bump means, and how to check before pushing.
chapter: Modules, tooling and packaging
minutes: 13
status: draft
---

## The manifest a release needs

```toml
[package]
name = "csv-records"
version = "0.4.0"
edition = "2024"
rust-version = "1.83"
description = "Parse and summarise CSV records"
license = "MIT"
repository = "https://github.com/example/csv-records"
keywords = ["csv", "parser"]
categories = ["parser-implementations"]
readme = "README.md"
exclude = ["tests/data/*", ".github/"]

[package.metadata.docs.rs]
all-features = true
```

`description` and `license` are required to publish. `rust-version` states the minimum compiler, and continuous
integration should check it with that exact toolchain rather than the latest. `exclude` keeps test fixtures out
of the package, which matters when the download size is compared across crates.

## Check the package before sending it

```bash
cargo package --list
cargo package
cargo publish --dry-run
```

`cargo package --list` prints exactly which files will be uploaded, which catches a stray data file or a missing
included directory. `cargo package` builds the crate from the packaged sources in `target/package`, so it also
catches a build that only works because of something not in the package.

## What a version bump means

| Change | Version |
| --- | --- |
| A bug fix, no API change | patch |
| A new function, a new feature, a new trait impl | minor |
| A removed item, a changed signature, a changed default | major |

Below 1.0 the convention is that a minor bump may break, which is why `0.4` and `0.5` are incompatible for
Cargo's resolver. That is a real constraint: a crate with dependents on `0.4` cannot be upgraded to `0.5`
without a code change.

Adding a variant to a public enum is a major change, because it breaks every exhaustive `match` downstream.
`#[non_exhaustive]` makes it a minor change instead, at the cost of a wildcard arm in every match. Adding a
field to a public struct is the same problem, solved the same way.

Adding a feature is a minor change. Turning a feature on in `default` is a breaking change, because it changes
what every existing user links.

## Publishing

```bash
cargo publish
cargo yank --version 0.4.0
```

A version on crates.io is permanent: the code cannot be replaced and a published version cannot be deleted. A
yank marks it as not selected for new resolutions, which is the emergency lever when a release is broken.
Nothing can be undone, so `--dry-run`, a fresh clone, and a build in a temporary directory are cheap steps
before the real one.

## Keeping dependencies honest

```bash
cargo audit
cargo deny check
```

`cargo audit` reports dependencies with a published advisory. `cargo deny` adds license and duplicate version
checks, which is what an organisation needs before a release. Both belong in continuous integration on a
schedule, because a new advisory is published against code that has not changed.

## Check yourself

Run `cargo package --list` on a project and read the file list for anything you did not intend to ship. Add the
missing metadata, run `cargo publish --dry-run`, and then unpack the generated crate into a temporary directory
and build it there.
