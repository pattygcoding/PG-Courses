---
title: Enums, Option and Result
summary: Variants that carry data, and the two enums the standard library builds null and exceptions from.
chapter: Types and data modelling
minutes: 13
status: draft
---

## An enum is a choice of shapes

```rust
enum Token {
    Number(i64),
    Word(String),
    Punctuation(char),
    End,
}

let tokens = vec![Token::Number(42), Token::Word(String::from("hi")), Token::End];
```

Each variant can carry different data, and a value is exactly one of them. That is a sum type: the compiler
knows which variants exist, so a `match` over every one of them is checked and a case you forgot is an error
rather than a runtime surprise.

## Option replaces null

```rust
fn find(needle: &str, haystack: &[String]) -> Option<usize> {
    haystack.iter().position(|item| item == needle)
}

match find("b", &names) {
    Some(index) => println!("found at {index}"),
    None => println!("not found"),
}
```

`Option<T>` is `Some(T)` or `None`, so the absence of a value is in the type and the caller has to handle it.
There is no null to dereference by accident, because `None` has nothing to dereference.

`Option<Box<T>>` and `Option<&T>` are pointer sized, since the zero value of the pointer carries the `None`.
That is the niche optimisation, and it is why an optional reference costs nothing.

## Result replaces exceptions

```rust
fn parse_size(text: &str) -> Result<u64, std::num::ParseIntError> {
    text.trim().parse::<u64>()
}

match parse_size("128") {
    Ok(size) => println!("{size} bytes"),
    Err(error) => eprintln!("bad size: {error}"),
}
```

`Result<T, E>` is `Ok(T)` or `Err(E)`. Nothing is thrown, so a failure is a visible value and the caller
handles it or passes it on. `?` propagates it, which the error handling chapter covers.

## Useful methods on both

```rust
let value: Option<u32> = Some(7);

value.unwrap_or(0);                    // 0 when None
value.unwrap_or_else(|| compute());     // computed only when None
value.map(|v| v * 2);                   // Some(14)
value.ok_or("missing")?;                // converts to Result
```

`unwrap` panics and belongs in tests and in code where the value is known to be present. `expect` says the same
thing with a message, so it is usually the better choice in a binary. `unwrap_or` and `unwrap_or_default` cover
the case where a fallback is meaningful.

## Attributes that matter at the boundary

```rust
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Status {
    Ready,
    Busy,
    Failed(String),
}

#[repr(u8)]
enum Code {
    Ok = 0,
    NotFound = 1,
}
```

`#[non_exhaustive]` lets you add a variant later without breaking downstream `match` statements, which is what
a public library wants. `#[repr(u8)]` fixes the representation, which is what a value crossing an FFI boundary
needs.

## Check yourself

Write an enum with at least three variants, one of them carrying data, and a function returning it. Match
every variant, then add a fourth and read the error the compiler gives at each `match`. Then do the same with
`Option` and note the difference in the message.
