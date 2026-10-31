---
title: Cargo and the project layout
summary: The manifest, the commands worth knowing, and how Cargo decides what to build.
chapter: Getting started
minutes: 12
status: draft
---

## One file describes the crate

```toml
[package]
name = "rust-tool"
version = "0.1.0"
edition = "2024"
rust-version = "1.83"

[dependencies]
serde = { version = "1", features = ["derive"] }

[dev-dependencies]
assert_cmd = "2"

[profile.release]
lto = "thin"
```

Cargo reads `Cargo.toml` for what to build, `Cargo.lock` for the exact versions that were resolved, and
`src/` for the code. A binary crate needs `src/main.rs`, a library crate needs `src/lib.rs`, and a crate can
have both.

## The layout that grows without rearranging

```text
rust-tool/
  Cargo.toml
  src/
    main.rs        the binary: argument parsing and output
    lib.rs         the library: everything worth testing
    parser.rs
  tests/
    cli.rs         integration tests that run the built binary
  benches/
    parse.rs
```

Putting the real work in the library and keeping `main.rs` thin is the single most useful structural habit
in Rust, because integration tests and benchmarks can only import the library.

## The commands you will use daily

```bash
cargo new rust-tool
cargo add serde --features derive
cargo run -- --input data.txt
cargo test
cargo clippy --all-targets -- -D warnings
cargo fmt
cargo doc --open
```

`--` separates Cargo's arguments from your program's. `cargo add` edits the manifest and picks a version,
which is faster than looking one up. `clippy -- -D warnings` turns lints into failures, which is the setting
that keeps a codebase clean.

## Dependencies are locked

```text
Cargo.lock
```

Cargo resolves semver-compatible versions and records them in the lock file, which is committed for a binary
and left out of the repository for a library. Updating happens on purpose:

```bash
cargo update
cargo update -p serde --precise 1.0.210
```

## Check yourself

Create a binary crate, move the real work into `src/lib.rs`, and add one integration test in `tests/` that
imports the library. Then add a dependency with `cargo add` and confirm the lock file changed.
