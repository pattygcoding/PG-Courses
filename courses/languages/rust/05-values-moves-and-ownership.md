---
title: Values, moves and ownership
summary: The rules, what a move costs, and how Copy changes the picture.
chapter: Ownership and borrowing
minutes: 14
status: draft
---

## The rules the compiler enforces

1. Every value has exactly one owner.
2. There is one owner at a time.
3. When the owner goes out of scope, the value is dropped.

```rust
fn main() {
    let text = String::from("hello");
    consume(text);
    println!("{text}");   // error[E0382]: borrow of moved value
}

fn consume(value: String) {
    println!("{value}");
}   // value is dropped here, once, by whoever owns it
```

The buffer was allocated on the heap by `String::from`, ownership of it moved into `consume`, and it is
freed when `consume` returns. There is no reference counting and no collector: the compiler knows the exact
point of the free, which is why Rust has no garbage collector and no leak from forgetting to free.

## A move copies the pointer, not the data

```rust
let a = String::from("hello");
let b = a;

println!("{b}");       // fine
println!("{a}");       // error: value borrowed here after move
```

Moving a `String` copies the pointer, the length and the capacity, and marks the source unusable. The heap
buffer stays where it is, so a move is cheap whatever the length of the text. That also explains why the
original name is dead rather than sharing: two owners would mean two frees.

## Copy types are copied instead

```rust
let x: i32 = 5;
let y = x;

println!("{x} {y}");   // both usable
```

A type that implements `Copy` is duplicated on assignment rather than moved, so the source stays valid. The
integers, floats, `bool`, `char`, raw pointers and shared references are `Copy`, and so is any struct whose
fields are all `Copy`:

```rust
#[derive(Clone, Copy)]
struct Point {
    x: f64,
    y: f64,
}
```

Deriving `Copy` promises that a bitwise copy is a correct copy, which is why a struct owning a `String`
cannot have it.

## Clone is the explicit deep copy

```rust
let a = String::from("hello");
let b = a.clone();
```

`clone` allocates a second buffer, so both names are usable and independent. It is a real cost, which is why
the borrow checker is usually the better answer and a `clone` added to silence it deserves a second look.

## Moving in and out of functions

```rust
fn build() -> String {
    String::from("built")
}

fn len_of(value: String) -> usize {
    value.len()
}

fn main() {
    let value = build();        // the return value moves into value
    let size = len_of(value);   // and moves out of it again
}
```

Both directions move, which is why a function that only needs to read should take `&String` or `&str`
instead. The next lesson covers that.

## Check yourself

Write a function that takes a `String` and returns its length, call it, and print the variable afterwards.
Read the compiler's message and the suggestion it makes. Then take a reference instead and confirm the
program compiles.
