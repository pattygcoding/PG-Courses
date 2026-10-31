---
title: Property testing and fuzzing
summary: Generate the inputs instead of writing them, and let the tool shrink a failure to its smallest case.
chapter: Testing and quality
minutes: 13
status: draft
---

## A property holds for every input

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn round_trip_never_loses_data(values in prop::collection::vec(any::<u32>(), 0..100)) {
        let encoded = encode(&values);
        let decoded = decode(&encoded).expect("round trip");

        prop_assert_eq!(decoded, values);
    }
}
```

`proptest` generates a hundred random vectors by default, runs the body on each, and reports the input when one
fails. That covers far more cases than the six examples a person writes, and it finds the empty vector, the
maximum value and the duplicate that the hand written table missed.

The cost is a dependency and a slower test run, so property tests usually sit alongside unit tests rather than
replacing them: examples document the behaviour, properties check it holds.

## Shrinking turns a failure into a small one

```text
minimal failing input: values = [0, 0, 0]
```

When a property fails, `proptest` reduces the input while it still fails, then prints the smallest one. That is
the whole reason to use it: a failure on a thousand element vector tells you little, and the same failure reduced
to three elements usually names the bug.

## Properties worth stating

```rust
proptest! {
    #[test]
    fn parse_size_matches_the_original(text in "[0-9]{1,20}") {
        let size = parse_size(&text).expect("digits parse");
        prop_assert_eq!(size.to_string(), text.trim_start_matches('0'));
    }

    #[test]
    fn sorting_is_idempotent(mut values in prop::collection::vec(any::<i32>(), 0..50)) {
        values.sort();
        let once = values.clone();
        values.sort();

        prop_assert_eq!(once, values);
    }
}
```

A round trip, an invariant that must hold after an operation, and equality with a simpler reference implementation
are the three shapes that find real bugs. A reference implementation is often the easiest: a slow but plainly
correct version checked against the fast one.

## Strategies describe the input

```rust
fn record() -> impl Strategy<Value = Record> {
    (0u64..1000, prop::collection::vec("[a-z]{1,8}", 0..5))
        .prop_map(|(size, tags)| Record { size, tags })
}
```

A strategy builds valid inputs, which keeps the test from asserting on cases the type cannot represent. Narrowing
the range to values the code is meant to handle makes the failure meaningful, and widening it later is how you
find out whether the code is ready for a bigger range.

## Fuzzing for the parser you do not trust

```rust
// fuzz/fuzz_targets/parse.rs
#![no_main]

use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    if let Ok(text) = std::str::from_utf8(data) {
        let _ = parse(text);
    }
});
```

```bash
cargo install cargo-fuzz
cargo fuzz run parse
```

`cargo fuzz` runs the body on bytes from a mutation based fuzzer, guided by coverage rather than random, for as
long as you leave it running. Every crash is saved to `fuzz/artifacts` as a small input that reproduces, and the
corpus in `fuzz/corpus` is committed so the next run starts from what was already found. It is the right tool for
a parser, a codec or anything taking untrusted input, and the wrong tool for a function whose inputs come from a
typed internal API.

## Mutation testing as a check on the tests

```bash
cargo install cargo-mutants
cargo mutants
```

`cargo-mutants` changes your code in small ways, such as replacing `<` with `<=`, and reports which changes the
test suite did not notice. It answers a different question from a coverage number: not whether a line ran, but
whether anything would have failed if it were wrong.

## Check yourself

Write a property test asserting that encoding and decoding round trips, run it until it passes, then introduce a
deliberate bug in the encoder and read the shrunken failing input.
