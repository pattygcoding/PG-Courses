---
title: Workspaces and crate boundaries
summary: Several crates in one repository with one lock file, shared dependencies and one target directory.
chapter: Modules, tooling and packaging
minutes: 13
status: draft
---

## A workspace coordinates crates

```toml
[workspace]
resolver = "2"
members = ["crates/core", "crates/cli", "crates/server"]

[workspace.package]
version = "0.4.0"
edition = "2024"
rust-version = "1.83"
license = "MIT"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }
```

A workspace has one `Cargo.lock` and one `target/` directory, so a change to a shared dependency is resolved once
and compiled once. Each member is a crate with its own `Cargo.toml`, and it can inherit the shared values:

```toml
[package]
name = "core"
version.workspace = true
edition.workspace = true
license.workspace = true

[dependencies]
serde.workspace = true

[dependencies.cli]
path = "../cli"
```

`version.workspace = true` takes the value from the root, so bumping every crate at once is one edit. A path
dependency points at another member, which is how the crates refer to each other during development and how they
resolve to published versions when released.

## Commands run per package

```bash
cargo test --workspace
cargo build -p cli
cargo run -p server -- --port 8080
cargo publish -p core
```

`-p` selects one package, and `--workspace` applies a command to all of them. `cargo test --workspace` is what
continuous integration should run, since it covers every crate rather than only the one in the current directory.

## Where to draw a boundary

A workspace is not an end in itself. The reason to split is a real difference in what the pieces are:

| Piece | Why it is separate |
| --- | --- |
| `core` | the library, no I/O, publishable and reusable |
| `cli` | a binary that depends on `core` |
| `server` | a binary with different dependencies, such as a web framework |

Splitting for the sake of it costs a `Cargo.toml` per crate and makes an internal change a two crate edit.
Splitting along the line between library and binaries pays for itself immediately, because it makes the library
testable in isolation and reusable by both binaries.

A common shape is the workspace plus one binary crate, then adding a second binary crate when the second use case
arrives. The `cli` crate is often thirty lines of argument handling and a call into the library.

## One crate or two for the API

A published crate that offers both a library and a binary can put both in one package: `src/lib.rs` plus
`src/main.rs`, where `main.rs` calls into the library. `cargo install` then installs the binary and a dependency
on the package gets the library. The separate crate is worth it when the binary has dependencies the library
should not pull in.

## Check yourself

Create a workspace with a library crate and a binary crate that depends on it, move the shared dependency to
`[workspace.dependencies]`, and run `cargo test --workspace`. Then add a second binary crate and run it with `-p`.
