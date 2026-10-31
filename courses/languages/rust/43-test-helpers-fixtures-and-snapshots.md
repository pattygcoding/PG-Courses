---
title: Test helpers, fixtures and snapshots
summary: Shared setup without copying it, parameterised cases, and tests that hold for every input.
chapter: Testing and quality
minutes: 13
status: draft
---

## A helper module shared between test files

```text
tests/
  common/
    mod.rs
  cli.rs
  parser.rs
```

```rust
// tests/common/mod.rs
pub fn write_fixture(name: &str, contents: &str) -> std::path::PathBuf {
    let path = std::env::temp_dir().join(name);
    std::fs::write(&path, contents).expect("fixture written");
    path
}
```

```rust
// tests/parser.rs
mod common;

#[test]
fn reads_a_fixture() {
    let path = common::write_fixture("parser.csv", "a,1\n");
    assert!(path.exists());
}
```

Putting the helper in a directory rather than a file at the top of `tests/` keeps Cargo from treating it as a
test binary of its own. `mod common;` in each test file includes it once per binary, which is the intended
arrangement.

## Builders keep test data readable

```rust
#[derive(Default)]
struct RecordBuilder {
    name: String,
    size: u64,
    tags: Vec<String>,
}

impl RecordBuilder {
    fn name(mut self, name: &str) -> Self {
        self.name = name.to_owned();
        self
    }

    fn size(mut self, size: u64) -> Self {
        self.size = size;
        self
    }

    fn build(self) -> Record {
        Record { name: self.name, size: self.size, tags: self.tags }
    }
}

let record = RecordBuilder::default().name("a").size(10).build();
```

A builder with a `Default` gives every test only the fields it cares about, so adding a field to `Record` does not
touch twenty tests. That is worth the thirty lines the builder costs as soon as the type has more than three
fields.

## Cases that differ only in data

```rust
#[test]
fn parses_sizes() {
    let cases = [
        ("0", 0u64),
        (" 128 ", 128),
        ("18446744073709551615", u64::MAX),
    ];

    for (input, expected) in cases {
        assert_eq!(parse_size(input).expect("valid"), expected, "input {input:?}");
    }
}
```

One test with a table runs all the cases and reports which one failed through the message argument. The `rstest`
crate does the same with one test name per case, which is easier to read in a report and worth adding when the
table grows.

## Snapshot tests

```rust
#[test]
fn renders_the_report() {
    let report = render(&records);

    insta::assert_snapshot!(report);
}
```

`insta` writes the output to a file beside the test on the first run and compares on every run afterwards. A
change shows as a diff and is accepted with `cargo insta review`, which is the right tool for a formatted report
or a generated message where writing the expected text by hand is tedious and easy to get wrong.

## Deterministic tests

```rust
#[test]
fn keeps_insertion_order() {
    let mut cache = Cache::new();
    cache.insert("a");
    cache.insert("b");

    assert_eq!(cache.keys().collect::<Vec<_>>(), vec!["a", "b"]);
}
```

A test that depends on iteration order of a `HashMap`, on the clock, or on a random seed is flaky and will fail
on someone else's machine. Inject the clock and the random source as a parameter, and where that is impractical,
assert on a property that holds for every ordering rather than on one specific order.

A `std::thread::sleep` to wait for a background task is the other common source, and it is better replaced by
joining the thread or waiting on a channel with a timeout.

## Check yourself

Move a duplicated setup into `tests/common/mod.rs`, use it from two test files, and add a builder for the type
under test. Then write a table driven test with four cases and read which case the failure message names.
