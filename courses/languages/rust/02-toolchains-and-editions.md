---
title: Toolchains, editions and targets
summary: rustup, the components worth installing, and what an edition does and does not change.
chapter: Getting started
minutes: 11
status: draft
---

## rustup manages the compiler

```bash
rustup show
rustup update
rustup component add clippy rustfmt
```

`rustup` installs and switches toolchains, so a project can pin the exact compiler it was written against.
`rustup show` prints the active toolchain, the installed targets and the components, which is the fastest
answer to "why does this build here and not there".

## Channels

| Channel | What it is |
| --- | --- |
| `stable` | released every six weeks, what you ship |
| `beta` | the next stable, for finding breakage early |
| `nightly` | unstable features behind `#![feature(...)]` |

A crate that needs nightly should say so, because it locks out everyone who does not. Reach for nightly
when a feature is genuinely required, and check whether it has stabilised since you last looked.

## Pin the toolchain in the repository

```toml
# rust-toolchain.toml
[toolchain]
channel = "1.83"
components = ["clippy", "rustfmt"]
```

That file makes `cargo` use that version for this directory, so a fresh clone builds with the compiler the
project was tested on. It also gives continuous integration the same answer without a second place to
configure.

## An edition is a compatibility checkpoint

```toml
[package]
edition = "2024"
```

An edition lets the language change syntax in a way that would otherwise break older code. Crates in
different editions link together, because the edition is a property of the crate and not of the compiler.
The 2021 edition changed closure capture, and the 2024 edition changed a few defaults and keywords.

Upgrading is per crate and mechanical:

```bash
cargo fix --edition
```

## Targets and cross compilation

```bash
rustup target add aarch64-unknown-linux-gnu
cargo build --target aarch64-unknown-linux-gnu
```

A target names the CPU, the vendor and the operating system. Cross compiling a binary for another platform
usually needs a linker for that platform, which is where a container or a tool such as `cross` makes the
setup repeatable.

## Check yourself

Print `rustup show`, install `clippy`, and pin a toolchain version in a project. Then build for a target
other than your own and note the extra tooling it asks for.
