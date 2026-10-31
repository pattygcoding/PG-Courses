---
title: Trait objects and dyn
summary: Dynamic dispatch through a vtable, object safety, and choosing between dyn and an enum.
chapter: Types and data modelling
minutes: 13
status: draft
---

## A trait object erases the type

```rust
trait Draw {
    fn draw(&self) -> String;
}

fn render_all(shapes: &[Box<dyn Draw>]) -> Vec<String> {
    shapes.iter().map(|shape| shape.draw()).collect()
}
```

`dyn Draw` is a type whose size is unknown until run time, so it is always behind a pointer. `Box<dyn Draw>`
owns, `&dyn Draw` borrows, and `Arc<dyn Draw>` shares across threads. Each call goes through a vtable: a table
of function pointers built per concrete type.

That is dynamic dispatch. The call is a few instructions slower and the compiler cannot inline it, so the same
code handles an unbounded set of types without a separate copy of the function for each.

## impl Trait is the static alternative

```rust
fn render(shape: impl Draw) -> String {
    shape.draw()
}

fn make() -> impl Draw {
    Circle { radius: 1.0 }
}
```

In argument position, `impl Draw` is shorthand for a generic parameter, so the call is monomorphised and fast.
In return position it means "one concrete type implementing this, decided by the function", which is what lets
a function hide the type it returns without boxing. It cannot be used for a collection of mixed types, because
the concrete type is fixed at compile time.

## Choosing between them

| Situation | Use |
| --- | --- |
| One function, any type | `impl Trait` parameter |
| A collection of mixed types | `Box<dyn Trait>` |
| A plugin loaded through a trait | `Box<dyn Trait>` |
| A closed set of variants you control | an enum |

An enum is often the better answer for a fixed set: it is `Copy`-able, it is exhaustive in a `match`, and it
needs no allocation. Use a trait object when the set of implementors is open, which is what a plugin or a
user-supplied callback needs.

## Object safety

```rust
trait Bad {
    fn make<T>(&self) -> T;           // generic method: cannot be a trait object
    fn new() -> Self;                 // no self: cannot be a trait object
    fn boxed(self) -> Box<Self>;      // takes self by value
}
```

A trait can only become a trait object when every method is callable through a pointer: no generic methods, no
`Self` in the return type, and a `self` receiver that is `&self`, `&mut self`, or `Box<Self>`. The compiler
reports which method blocks it, so the fix is usually to move that one method to a separate trait.

## Trait objects and Send

```rust
type Job = Box<dyn FnOnce() + Send + 'static>;

fn run(job: Job) {
    std::thread::spawn(job);
}
```

A trait object can carry marker traits such as `Send` and `Sync` and a lifetime bound, written as
`dyn Trait + Send + 'static`. That is the standard shape for a work item handed to another thread, and it is
where the compiler will ask for the extra bounds if the object crosses a thread.

## Check yourself

Write a trait with two implementors, store both in one `Vec<Box<dyn Trait>>` and render them in a loop. Then
rewrite the same thing with `impl Trait` and note which version compiles for the mixed collection and which
one lets a caller add a type you have never seen.
