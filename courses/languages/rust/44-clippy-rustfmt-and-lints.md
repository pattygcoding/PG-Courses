---
title: Clippy, rustfmt and lints
summary: The two tools that hold a codebase to one style, and how to configure the lints in the manifest.
chapter: Testing and quality
minutes: 13
status: draft
---

## rustfmt settles formatting

```bash
cargo fmt
cargo fmt -- --check
```

`cargo fmt` rewrites the files in place, and `--check` exits non-zero when something would change, which is the
form continuous integration wants. A `rustfmt.toml` at the root configures the few things worth changing:

```toml
max_width = 100
use_field_init_shorthand = true
```

Most options are unstable and need a nightly toolchain, which is a reason to keep the file short. The value of
`rustfmt` is that nobody argues about line breaks in review, not that its choices are the best ones.

## Clippy catches the things the compiler allows

```bash
cargo clippy --all-targets --all-features -- -D warnings
```

`--all-targets` includes tests, benchmarks and examples, which is where a surprising number of issues hide because
a plain `cargo clippy` skips them. `-D warnings` turns every lint into a build failure, which is what stops the
list from growing; a lint that is merely a warning gets ignored until the count is in the hundreds.

`cargo clippy --fix` applies the machine applicable suggestions, and it is worth running before reading anything
by hand.

## Configuring lints in the manifest

```toml
[lints.rust]
unsafe_code = "forbid"
missing_debug_implementations = "warn"

[lints.clippy]
unwrap_used = "warn"
todo = "deny"
pedantic = { level = "warn", priority = -1 }
```

The `[lints]` table sets the level for a whole crate without a `#![warn(...)]` line in every root file, and it
applies to every target including tests. `pedantic` as a group needs the negative priority so individual lints can
still override it.

`forbid` is stronger than `deny`: it cannot be relaxed by an inner attribute, which makes it the right level for
something like `unsafe_code` in a crate that has decided not to use it.

## Allowing one lint in one place

```rust
#[allow(clippy::too_many_arguments)]
fn build(name: &str, host: &str, port: u16, timeout: u64) -> Config {
    // the four arguments come from one config file line
}
```

An `allow` is a decision, so put it on the smallest item that needs it and say why when the reason is not obvious
from the code. `#[expect(clippy::...)]` is the newer form that also warns when the lint stops firing, which is how
a stale allow gets cleaned up.

## Lints that pay for themselves

```rust
#[must_use]
pub fn parse_size(text: &str) -> Option<u64> { /* ... */ }
```

`#[must_use]` warns when a caller ignores the result, which catches `length()` called as a statement. `dead_code`
reports a private function nobody calls. `unused_imports` and `unused_variables` keep a refactor from leaving
litter. These three are usually on by default, and the ones worth adding deliberately are `unwrap_used`, which
forces `expect` with a message or a proper error, and `missing_docs` for a library.

## A check that runs on every push

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
```

Those three lines are the whole quality gate for most projects. Add `cargo doc` with `-D warnings` when the crate
is published, and `cargo deny check` when dependencies are a concern.

## Check yourself

Run `cargo clippy --all-targets -- -D warnings` on a project and fix what it reports. Then add `unwrap_used` as a
warning in the `[lints]` table and see how many unwraps in your tests and code it catches.
