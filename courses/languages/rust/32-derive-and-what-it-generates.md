---
title: Derive and what it generates
summary: The list of derivable traits, the bounds they add, and the cases where writing it by hand is right.
chapter: Traits in depth
minutes: 13
status: draft
---

## The list

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default)]
struct Point {
    x: i32,
    y: i32,
}
```

Each one writes an `impl` with the obvious body: `Clone` calls `clone` on every field, `PartialEq` compares
every field, `Ord` compares fields in declaration order, `Hash` feeds every field to the hasher, and `Default`
uses the default of every field. Reading the generated code is a good way to learn what the traits mean, and
`cargo expand` prints it.

## Derive adds a bound per type parameter

```rust
use std::sync::Arc;

#[derive(Debug)]
struct Shared<T> {
    value: Arc<T>,
    name: String,
}

let first = Shared { value: Arc::new(1u8), name: String::from("a") };
let second = first.clone();   // error: derived Clone requires T: Clone
```

The generated `impl` is `impl<T: Clone> Clone for Shared<T>`, so a type parameter that the body never clones
still has to implement `Clone`. Writing the trait by hand removes the bound, because cloning an `Arc` only
increments a counter:

```rust
impl<T> Clone for Shared<T> {
    fn clone(&self) -> Self {
        Self {
            value: Arc::clone(&self.value),
            name: self.name.clone(),
        }
    }
}
```

The same trap appears with `Default` and `Debug` on a struct with a `PhantomData` parameter. When a derive adds
a bound the body does not need, write the impl.

## Where derive is the wrong answer

```rust
#[derive(PartialEq)]
struct Money {
    cents: i64,
}
```
is fine. But:

```rust
#[derive(PartialEq, Default)]
struct Port(u16);
```

`Default` gives port 0, which is not a valid port. A default that violates the type's invariant is worse than no
default, because a caller can construct an invalid value without going through the constructor. Implement
`Default` by hand, or not at all.

`PartialOrd` derived on a struct whose fields include something that should not affect the sort order is another
common mistake: a `created_at` field last in the struct means the sort ignores it until every earlier field is
equal. Deriving `Ord` on a `HashMap` field is impossible, since `HashMap` is not `Ord`, which is the compiler
saying the ordering is not defined.

## Default on an enum

```rust
#[derive(Default)]
enum Level {
    #[default]
    Quiet,
    Normal,
    Loud,
}
```

Marking one variant with `#[default]` gives the enum a `Default`, which is what a configuration with an
optional setting wants.

## Derive on a type with a lifetime

```rust
#[derive(Debug, Clone, PartialEq)]
struct View<'a> {
    text: &'a str,
    offset: usize,
}
```

The generated impls carry the lifetime, so `View<'a>` is `Clone` when the reference is, which it always is.
Nothing extra is needed.

## Check yourself

Write a struct holding an `Arc<T>` and a `String`, derive `Debug`, and write `Clone` by hand so cloning works
without `T: Clone`. Then add a `Default` that respects an invariant in a constructor and explain why deriving it
would have been wrong.
