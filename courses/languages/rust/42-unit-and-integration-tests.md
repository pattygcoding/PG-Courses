---
title: Unit and integration tests
summary: Tests beside the code, tests that run the public API as a separate crate, and the flags worth knowing.
chapter: Testing and quality
minutes: 14
status: draft
---

## A test is a function with an attribute

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_line_with_whitespace() {
        let record = parse_line("report.csv, 128").expect("valid line");

        assert_eq!(record.name, "report.csv");
        assert_eq!(record.size, 128);
    }
}
```

`#[cfg(test)]` keeps the module out of a release build, `#[cfg(test)]` plus `use super::*` gives a test access
to private items, and `cargo test` runs every function marked `#[test]`. A test fails when it panics, so
`assert_eq!` and `assert!` are the whole assertion library you need.

## A test can return a Result

```rust
#[test]
fn round_trips_through_disk() -> Result<(), Box<dyn std::error::Error>> {
    let path = std::env::temp_dir().join("records.csv");
    std::fs::write(&path, "a,1\n")?;

    let records = load(&path)?;
    assert_eq!(records.len(), 1);

    Ok(())
}
```

Returning a `Result` lets the test use `?`, which is far shorter than an `expect` on every call. The panic
message for a failing `expect` also points at the helper rather than the assertion, so `?` reads better when a
test has five fallible steps.

## Integration tests are a separate crate

```rust
// tests/cli.rs
use assert_cmd::Command;

#[test]
fn reports_a_missing_file() {
    Command::cargo_bin("csv-records")
        .expect("binary built")
        .arg("--input")
        .arg("missing.csv")
        .assert()
        .failure();
}
```

Anything in `tests/` is compiled against the built library as if it were a downstream dependency, so it can only
use the public API. That is the point: it tests the crate as a user gets it, and it catches a public item that
is accidentally not exported.

Unit tests in `src/` cover the pieces and integration tests cover the contract. Both belong in the same
`cargo test` run, which is what makes the habit cheap.

## Flags worth knowing

```bash
cargo test parses_a_line
cargo test -- --nocapture
cargo test -- --test-threads=1
cargo test -- --ignored
```

A plain filter string runs every test whose name contains it, which is why descriptive names such as
`parses_a_line_with_whitespace` pay off. `--nocapture` shows the output of `println!` inside passing tests, which
is the quickest way to see why a test failed. `--test-threads=1` serialises the run, which matters for a test that
uses a fixed temporary path or a shared port.

## Marking the awkward tests

```rust
#[test]
#[ignore = "needs a network connection"]
fn fetches_a_schema() { /* ... */ }

#[test]
#[should_panic(expected = "count must be positive")]
fn rejects_a_zero_count() {
    average(1, 0);
}
```

`#[ignore]` keeps a slow or environment dependent test out of the default run. `#[should_panic]` documents that
a panic is the contract, and the `expected` string is worth setting, since without it any panic passes, including
one from a typo elsewhere in the test.

## Check yourself

Move one test from a `#[cfg(test)]` module in `src/` into `tests/`, get it compiling against the public API, and
run it with `cargo test --test cli`. Then add a `#[should_panic(expected = "...")]` test for a panic your code
already has.
