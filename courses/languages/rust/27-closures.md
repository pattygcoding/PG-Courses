---
title: Closures
summary: Anonymous functions that capture, the three Fn traits, and how to store one in a struct.
chapter: Collections and iterators
minutes: 14
status: draft
---

## A closure is a function with captured state

```rust
let threshold = 10;

let keep = |value: i32| value > threshold;

let values = vec![4, 11, 20];
let large: Vec<i32> = values.into_iter().filter(|v| keep(*v)).collect();
```

The closure reads `threshold` from the enclosing scope, which a plain function cannot do. Its type is unnamed
and unique to that expression, so two closures with the same body have different types.

## The three traits

```rust
trait Fn: FnMut { }          // may be called repeatedly, borrows what it captures
trait FnMut: FnOnce { }      // may be called repeatedly, mutates what it captures
trait FnOnce { }             // may be called at most once, consumes what it captures
```

`FnOnce` is the loosest bound and `Fn` the strictest. A function that only needs to call the closure once should
ask for `FnOnce`, because that accepts all three. Asking for `Fn` when `FnMut` would do rejects a closure that
updates a counter, which is a common and avoidable friction.

```rust
fn apply_twice<F: FnMut(i32) -> i32>(mut f: F, value: i32) -> i32 {
    f(f(value))
}

let mut calls = 0;
let doubled = apply_twice(|value| {
    calls += 1;
    value * 2
}, 3);
```

The parameter is `mut f` because calling an `FnMut` closure mutates it, which is what lets it update `calls`.

## Capturing by reference or by move

```rust
let names = vec!["ada", "grace"];

let count = || names.len();               // captures &names

let owned = move || names.len();          // captures names by value
```

`move` is required whenever the closure outlives the current scope, which is the case for a thread, a spawned
task, or a `'static` callback:

```rust
let handle = std::thread::spawn(move || names.len());
let count = handle.join().expect("thread panicked");
```

Without `move` the closure borrows a local that the thread may outlive, and the compiler says exactly that.

## Storing a closure

```rust
struct Filter {
    predicate: Box<dyn Fn(&Entry) -> bool>,
}

impl Filter {
    fn matches(&self, entry: &Entry) -> bool {
        (self.predicate)(entry)
    }
}

let filter = Filter {
    predicate: Box::new(|entry: &Entry| entry.size > 1024),
};
```

A struct field needs a type, and a closure has no name, so the field is a boxed `dyn Fn`. A generic parameter
`F: Fn(&Entry) -> bool` avoids the allocation when the struct only ever holds one closure type, which is
usually the better choice in a library and the awkward one in a collection of mixed closures.

## Returning a closure

```rust
fn multiplier(factor: i32) -> impl Fn(i32) -> i32 {
    move |value| value * factor
}
```

`impl Fn` names the trait rather than the unnameable closure type. The `move` is needed because `factor` is a
local that would otherwise be dropped when the function returns.

## Closures that need a lifetime

```rust
fn count_matching<'a, F>(items: &'a [&'a str], f: F) -> usize
where
    F: Fn(&str) -> bool,
{
    items.iter().filter(|item| f(item)).count()
}
```

The bound says the closure takes a borrowed string and returns a `bool`. Elision covers the lifetimes here, so
the annotation is rarely written out.

## Check yourself

Write a function taking `FnMut` that calls the closure three times, pass one that increments a captured
counter, and print the counter afterwards. Then store a closure in a struct, box it, and call it through a
method.
