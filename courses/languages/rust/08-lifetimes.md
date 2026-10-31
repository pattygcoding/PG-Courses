---
title: Lifetimes
summary: What an annotation means, how elision covers the common shapes, and how to read the errors.
chapter: Ownership and borrowing
minutes: 15
status: draft
---

## A lifetime is a relationship

```rust
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}
```

`'a` says the returned reference is valid for no longer than both inputs. It does not say how long anything
lives and it does not change when anything is dropped. It is a constraint the compiler checks at each call
site, which is why the body never mentions it again.

## Why this function needs the annotation

```rust
fn longest(a: &str, b: &str) -> &str {
    if a.len() >= b.len() { a } else { b }
}
```

```text
error: missing lifetime specifier
help: this function's return type contains a borrowed value, but the signature does not say
      whether it is borrowed from `a` or `b`
```

The compiler cannot tell which input the output came from, and it has to know to check the caller. The
annotation answers that question, so it is documentation the compiler verifies.

## Elision covers the common shapes

```rust
fn first_word(text: &str) -> &str                 // one input lifetime, so the output gets it
fn set(&mut self, value: &str)                    // a method: the output borrows from self
struct Parser<'a> { input: &'a str }              // a struct holding a reference needs one
```

The rules are short: every input reference gets its own lifetime, a single input lifetime is assigned to the
output, and `&self` or `&mut self` is assigned to the output. When those rules cover the case, adding
annotations is noise, which is why most functions in a codebase have none.

## A struct that holds a reference

```rust
struct Parser<'a> {
    input: &'a str,
    position: usize,
}

impl<'a> Parser<'a> {
    fn new(input: &'a str) -> Self {
        Self { input, position: 0 }
    }

    fn rest(&self) -> &'a str {
        &self.input[self.position..]
    }
}
```

The parser cannot outlive the text it points at, and the compiler enforces that everywhere a `Parser` is
used. That is the payoff: the rule is checked rather than written in a comment, so nobody can hold a parser
after the buffer it reads is gone.

## 'static means the whole program

```rust
fn label() -> &'static str {
    "available for the run"
}
```

String literals are `'static` because they live in the binary. A `&'static` reference to heap data can only
come from leaking it, so reaching for `'static` to silence an error usually means the design wants an owned
value instead.

## Read the error, not the compiler

```text
error[E0597]: `text` does not live long enough
  --> src/main.rs:12:13
   |
12 |     let parser = Parser::new(&text);
   |                           ^^^^^ borrowed value does not live long enough
   |
   = note: `text` dropped here while still borrowed
```

The message names the value, the borrow and the drop point. The fix is either to shorten the borrow or to own
the data, and which one is possible is usually obvious once the note is read rather than guessed at.

## Check yourself

Write `longest` without annotations, read the error text, and add what it asks for. Then make a struct hold a
`&str` and try to return one from a function that creates the text locally.
