---
title: Generics and monomorphisation
summary: Write once for many types, and know that the compiler writes a separate copy for each one.
chapter: Types and data modelling
minutes: 13
status: draft
---

## A generic function

```rust
fn largest<T: PartialOrd>(items: &[T]) -> Option<&T> {
    let mut best = items.first()?;

    for item in items {
        if item > best {
            best = item;
        }
    }

    Some(best)
}
```

`T` is a type parameter and `PartialOrd` is the bound that says what `T` can do. The bound is what makes `>`
legal: without it the compiler has no reason to believe comparison exists for `T`. The call site names no
type, because inference reads it from the argument.

```rust
println!("{:?}", largest(&[3, 9, 4]));
println!("{:?}", largest(&["a", "c", "b"]));
```

## Generic types and where clauses

```rust
struct Stack<T> {
    items: Vec<T>,
}

impl<T> Stack<T> {
    fn push(&mut self, item: T) {
        self.items.push(item);
    }
}

impl<T: std::fmt::Display> Stack<T> {
    fn print(&self) {
        for item in &self.items {
            println!("{item}");
        }
    }
}
```

The second `impl` block adds a method only where `T` implements `Display`, so `print` is unavailable on a
`Stack<Vec<u8>>`. Splitting `impl` blocks by bound keeps the requirements next to the methods that need them.

A long bound list moves to a `where` clause:

```rust
fn merge<K, V>(a: Map<K, V>, b: Map<K, V>) -> Map<K, V>
where
    K: Ord + Clone,
    V: Clone,
{
    // ...
}
```

## Turbofish when inference cannot decide

```rust
let parsed = "42".parse::<i32>()?;
let empty = Vec::<String>::new();
```

A turbofish names the type parameter at the call site. It appears when nothing else fixes the type, most
often with `parse`, `collect` and `FromStr`.

## Monomorphisation is the trade

The compiler generates a specialised copy of the generic code for each concrete type used, so `largest::<i32>`
and `largest::<&str>` are two functions in the binary, each fully optimised. That is the zero-cost part: the
generic call site does not go through a table of function pointers, and the optimiser sees through the
abstraction.

The cost is binary size and compile time. A heavily generic library used with many types produces more machine
code than the source suggests, which is the reason `cargo bloat` exists. Using a trait object instead trades
the inlining for one shared copy of the code, and the next lesson covers that trade directly.

## Bounds affect what the compiler can prove about a type

```rust
fn duplicate<T: Clone>(value: T) -> (T, T) {
    (value.clone(), value)
}
```

Add a bound only when the body needs it. A bound the function does not use makes the API harder to call, since
every caller has to satisfy something nobody asked for.

## Check yourself

Write a generic function with two type parameters and a `where` clause, call it with two different pairs of
types, and confirm both compile. Then build in release and compare the binary size against a version using a
trait object instead.
