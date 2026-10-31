---
title: Result, the question mark and propagation
summary: Failures as values, how ? converts error types, and where a panic is the honest answer.
chapter: Error handling
minutes: 14
status: draft
---

## ? is early return with a conversion

```rust
fn read_size(path: &std::path::Path) -> Result<u64, std::io::Error> {
    let text = std::fs::read_to_string(path)?;
    let size = text.trim().parse::<u64>()?;

    Ok(size)
}
```

`?` unwraps an `Ok`, and on an `Err` it returns from the function immediately with that error converted to the
function's error type. The conversion goes through `From`, which is why a `ParseIntError` becomes an
`io::Error` here: the standard library implements that conversion.

Without conversions the same code reads:

```rust
let text = match std::fs::read_to_string(path) {
    Ok(text) => text,
    Err(error) => return Err(error),
};
```

Both are correct; `?` is what keeps a function readable when it has four fallible steps.

## ? works on Option too

```rust
fn first_word(text: Option<String>) -> Option<String> {
    let word = text?;
    word.split_whitespace().next().map(String::from)
}
```

The same operator returns `None` early. It can only be used in a function returning `Option`, and mixing `?`
on a `Result` inside an `Option` returning function needs an explicit conversion such as `.ok()?`.

## main can return a Result

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port: u16 = std::env::args().nth(1).unwrap_or_default().parse()?;
    println!("listening on {port}");

    Ok(())
}
```

The runtime prints the `Debug` of the error and exits with a non-zero status, which is enough for a small tool.
A real binary wants to control the message, so it catches the error and formats it itself.

## Collecting results

```rust
let numbers: Result<Vec<i32>, _> = ["1", "2", "x"]
    .iter()
    .map(|item| item.parse::<i32>())
    .collect();

println!("{numbers:?}");     // Err(ParseIntError { .. })
```

`collect` into a `Result<Vec<T>, E>` stops at the first error and returns it. That turns a loop with `?` inside
into one expression, and it is the reason the iterator machinery is worth learning.

## What belongs in a Result and what panics

Use `Result` when the caller can do something useful: retry, report to the user, use a default. Panic when the
situation is a bug: an index that cannot be in range, a lock poisoned by a failed invariant, a value the code
checked a line earlier.

```rust
let config = Config::from_env().expect("configuration must be readable");
```

`expect` states the assumption. In a binary that is often right, because there is nothing to do but stop. In a
library it is not, because the library cannot decide for the caller.

## Check yourself

Write a function with three fallible steps using `?`, then rewrite it with `match` and compare the line counts.
Then replace the `?` chain with a `collect` that parses a list and confirm the first failure is the one
returned.
