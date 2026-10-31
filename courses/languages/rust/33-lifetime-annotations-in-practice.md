---
title: Lifetime annotations in practice
summary: The shapes that need them, the placeholder, and the bounds that say a type parameter outlives a borrow.
chapter: Lifetimes and smart pointers
minutes: 14
status: draft
---

## The four shapes that need an annotation

```rust
struct Parser<'a> {          // a struct holding a reference
    input: &'a str,
}

fn pick<'a>(a: &'a str, b: &'a str) -> &'a str { a }    // several inputs, one output

impl<'a> Parser<'a> {
    fn rest(&self) -> &'a str {                 // a method returning a reference with its own lifetime
        &self.input[0..]
    }
}

fn longest<'a>(items: &'a [String]) -> &'a String {     // the output borrows the input
    &items[0]
}
```

Everything else is covered by elision, so a function body with no annotations is the normal case rather than a
sign of something missing.

## The placeholder avoids naming what elision already decides

```rust
impl Parser<'_> {
    fn len(&self) -> usize {
        self.input.len()
    }
}

fn first(items: &[&str]) -> Option<&str> {
    items.first().copied()
}
```

`'_` means "the compiler works it out here", which is more honest than inventing `'a` for a lifetime you do not
care about. The 2018 edition made `impl Parser<'_>` legal, and it is the form `clippy` prefers where the
lifetime adds nothing.

## A type parameter that outlives a borrow

```rust
struct Holder<'a, T: 'a> {
    value: &'a T,
    label: &'a str,
}

fn store<'a, T>(value: &'a T) -> Holder<'a, T> {
    Holder { value, label: "stored" }
}
```

`T: 'a` says the type `T` outlives the borrow `'a`. Without it the compiler cannot rule out `T` itself
containing a shorter reference, and it reports the missing bound. The bound is required whenever a borrowed `T`
is stored alongside a reference.

## A borrowed self with its own lifetime

```rust
struct Wrapper {
    name: String,
}

impl Wrapper {
    fn name(&self) -> &str {
        &self.name            // elision gives the output the lifetime of &self
    }

    fn shared(&self) -> &String {
        &self.name
    }
}
```

An accessor borrows from `self`, so elision covers it. An accessor that returns something the struct borrowed
from elsewhere needs its own lifetime parameter:

```rust
struct View<'a> {
    text: &'a str,
}

impl<'a> View<'a> {
    fn text(&self) -> &'a str {
        self.text              // the result outlives &self
    }
}
```

That difference matters: `view.text()` stays usable after the view itself is gone, which is what a zero copy
parser wants.

## Higher-ranked bounds

```rust
fn call_with<F>(f: F)
where
    F: for<'a> Fn(&'a str) -> usize,
{
    f("borrowed");
}
```

`for<'a>` says the closure works for any lifetime the caller chooses, which is what a function taking a closure
and passing it a local reference needs. It appears rarely, and the compiler prints it in error messages when a
closure is written in a way that ties its parameter to one specific borrow.

## Do not widen without a reason

A struct that owns its data needs no lifetime at all, and adding one to save a `String` clone is often the wrong
trade: it makes every use of the struct carry the borrow and forces the caller to keep the buffer alive. Reach
for a lifetime where the data is large and the borrow is short, and for an owned field where the type is going
to be stored, sent or returned.

## Check yourself

Write a zero copy parser holding `&'a str` with an accessor returning `&'a str`, then add a second method
returning `&str` tied to `&self`. Call both after dropping the parser and note which one the compiler allows.
