---
title: Cargo features and conditional compilation
summary: Optional dependencies, feature unification, and the cfg attributes that select code at build time.
chapter: Modules, tooling and packaging
minutes: 13
status: draft
---

## A feature turns code on

```toml
[features]
default = ["json"]
json = ["dep:serde_json"]
async = ["dep:tokio", "tokio/rt-multi-thread", "tokio/macros"]

[dependencies]
serde = { version = "1", optional = true }
serde_json = { version = "1", optional = true }
tokio = { version = "1", optional = true }
```

```rust
#[cfg(feature = "json")]
pub fn parse_json(input: &str) -> Result<Value, Error> {
    serde_json::from_str(input).map_err(Error::from)
}
```

`dep:serde_json` enables the optional dependency without creating an implicit feature of the same name, which is
the modern form and what `cargo` recommends. The `#[cfg]` attribute removes the item entirely when the feature is
off, so a caller without the feature cannot reach it and does not link the dependency.

## Features are additive and unified

```bash
cargo build --no-default-features --features async
```

Cargo unifies features across the dependency graph: if two crates in the build ask for different features of the
same dependency, both are enabled. That is why a feature must only add capability, never remove it, and never
change behaviour in a way that breaks another crate expecting the default. A feature that switches an
implementation, such as "use the Rust backend instead of the C one", breaks that rule and is the source of most
feature related trouble in the ecosystem.

For the same reason, `--all-features` builds a configuration no real user has, so it is worth testing the
default set and one or two others as well.

## Conditional compilation beyond features

```rust
#[cfg(target_os = "windows")]
fn separator() -> char { '\\' }

#[cfg(not(target_os = "windows"))]
fn separator() -> char { '/' }

if cfg!(debug_assertions) {
    println!("debug build");
}
```

`cfg!` evaluates to a `bool` without removing the code, so both branches must still compile. The attribute form
removes the code, which is what you want when one branch uses an API that does not exist on another platform.

```toml
[target.'cfg(windows)'.dependencies]
winapi = "0.3"

[target.'cfg(unix)'.dependencies]
nix = "0.29"
```

Dependencies can be platform specific, so a Windows build does not download the Unix one. The same syntax works
for a target triple when you need it.

## Build scripts

```rust
// build.rs
fn main() {
    println!("cargo::rerun-if-changed=build.rs");
}
```

A `build.rs` at the crate root runs before compilation and can emit directives such as a link library, a search
path, or `cfg` values through `cargo::rustc-cfg`. It is the hook for linking the C library you call through FFI.
Keep it to that: a build script that generates a lot of Rust makes every build slower and is hard to debug.

## Check yourself

Add an optional dependency behind a feature, gate one function with `#[cfg(feature = "...")]`, and build with and
without the feature. Then confirm that a crate depending on yours cannot call the gated function when the
feature is off.
