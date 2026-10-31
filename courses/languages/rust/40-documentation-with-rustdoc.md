---
title: Documentation with rustdoc
summary: Doc comments that build into a site, code blocks that run as tests, and the sections worth writing.
chapter: Modules, tooling and packaging
minutes: 13
status: draft
---

## /// documents the item below it

```rust
/// Reads a record from one line of the input.
///
/// The line is expected to be `name,size`, with optional whitespace
/// around either field.
///
/// # Examples
///
/// ```
/// use mylib::parse_line;
///
/// let record = parse_line("report.csv, 128")?;
/// assert_eq!(record.size, 128);
/// # Ok::<(), mylib::Error>(())
/// ```
pub fn parse_line(line: &str) -> Result<Record, Error> { /* ... */ }
```

`///` attaches to the next item, and `//!` at the top of a file documents the module or crate itself. The body is
Markdown, so it takes headings, lists, tables and links. `cargo doc --open` renders the whole thing into a
browsable site with a search index.

## Code blocks in documentation are tests

That example runs when you type `cargo test`. A doc example that has drifted out of date is a failing test rather
than a misleading paragraph, which is the reason to prefer doctests for anything a reader will paste.

A line starting with `# ` is compiled but hidden from the rendered output, which is how the `Ok::<(), Error>(())`
line above keeps the example valid while the reader sees only the interesting part.

````rust
/// ```text
/// report.csv, 128
/// ```
````

Declaring a language other than `rust` or `ignore` turns the block into a plain listing rather than a test. Use
`ignore` for an example that genuinely cannot run, and treat each one as a note to check later.

## Intra-doc links

```rust
/// Wraps a [`Record`] read by [`parse_line`].
///
/// Returns an [`Error`] when the line has the wrong number of fields.
pub struct Entry(Record);
```

Square brackets around an item name become a link that `rustdoc` resolves, and an unresolvable one is a warning
with `-D warnings`. That keeps a doc comment honest when a type is renamed.

## The sections a reader expects

```rust
/// Splits a line into fields.
///
/// # Panics
///
/// Panics when the line contains a NUL byte.
///
/// # Errors
///
/// Returns [`Error::Malformed`] when a field is empty.
///
/// # Safety
///
/// The caller must pass a pointer valid for `len` bytes.
pub unsafe fn parse_raw(ptr: *const u8, len: usize) -> Result<Record, Error> { /* ... */ }
```

`# Panics`, `# Errors` and `# Safety` are the conventional headings, and `clippy` checks that a function
returning `Result` mentions its errors. A `pub unsafe fn` needs a `# Safety` section that says what the caller
must guarantee, because that is the contract the compiler cannot check.

## Lints for documentation

```toml
[lints.rust]
missing_docs = "warn"
rustdoc.unsafe_op_in_unsafe_fn = "warn"

[lints.clippy]
missing_errors_doc = "warn"
```

Turning `missing_docs` on for a library is a small cost per item and makes the public surface self describing. A
crate whose README belongs in the docs can include it directly:

```rust
#![doc = include_str!("../README.md")]
```

## Check yourself

Write a doc comment with an example, add a hidden `# ` line, and run `cargo test` to confirm the example is
executed. Then run `cargo doc --open` and check the link from one item to another.
