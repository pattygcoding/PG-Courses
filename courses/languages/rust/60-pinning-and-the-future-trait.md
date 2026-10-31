---
title: Pinning and the Future trait
summary: Why a future cannot move once it is polled, and how to write one by hand when you need to.
chapter: Advanced and the edges
minutes: 14
status: draft
---

## The problem Pin solves

```rust
async fn example() {
    let text = String::from("hello");
    let borrowed = &text;

    something().await;      // the future is suspended here, holding `borrowed`

    println!("{borrowed}");
}
```

The generated state machine holds `text` and a reference into it, so the future refers to its own memory. If it
were moved after being polled, the reference would point at the old location and the program would be wrong
without any unsafe code visible anywhere. `Pin` is the type that makes moving impossible.

## Unpin marks the types that do not care

```rust
fn poll_it<F: Future + Unpin>(future: &mut F) { /* ... */ }
```

`Unpin` is an auto trait implemented for almost everything, including all the types you write. A future is `Unpin`
when nothing inside it is self-referential, which covers futures that await only other `Unpin` futures. `Pin` has
no effect on `Unpin` types, which is why most code never notices it.

## Pin, and the ways to get one

```rust
use std::pin::Pin;

let mut future = fetch(1);

let pinned: Pin<&mut _> = Pin::new(&mut future);      // requires Unpin
let boxed: Pin<Box<_>> = Box::pin(fetch(1));          // works for everything, allocates
let stacked = std::pin::pin!(fetch(1));                // pinned on the stack
```

`Pin::new` only compiles for an `Unpin` type, so it is the safe way to pin something that does not need it.
`Box::pin` allocates and works for a future that is not `Unpin`, which is what an executor storing many of them
uses. The `pin!` macro pins a value to the current stack frame, which is what you want for a future awaited in one
place.

## Implementing Future by hand

```rust
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

struct Ready(Option<u32>);

impl Future for Ready {
    type Output = u32;

    fn poll(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<u32> {
        match self.0.take() {
            Some(value) => Poll::Ready(value),
            None => Poll::Pending,
        }
    }
}
```

`Ready` holds its output until the first poll and then reports `Pending` forever, which is a future a `select!`
can race against. A real future that waits for an event stores the waker from the context and calls it when the
event arrives:

```rust
fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<()> {
    self.state.lock().expect("poisoned").waker = Some(cx.waker().clone());
    Poll::Pending
}
```

That waker registration is the whole contract. A future that returns `Pending` without arranging a wake-up is
never polled again, and the task hangs with no error.

## Structural pinning

```rust
struct Wrapper<F> {
    inner: F,
    count: u64,
}

impl<F: Future> Future for Wrapper<F> {
    type Output = F::Output;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<F::Output> {
        // SAFETY: inner is structurally pinned and count is never moved out
        let this = unsafe { self.get_unchecked_mut() };
        let inner = unsafe { Pin::new_unchecked(&mut this.inner) };
        inner.poll(cx)
    }
}
```

A wrapper around a future has to pass the pinning through to the field, which is called structural pinning. The
`SAFETY` comment states which fields are pinned and why the wrapper's other fields are not moved as a whole. This
is one of the few places where `unsafe` appears in ordinary async code, and it belongs in a library with tests.

## Where this is needed in practice

Writing an executor, a channel, a timer or a combinator means implementing `Future` and dealing with `Pin`.
Using async does not: `.await`, `tokio::spawn` and `futures::join!` all handle it. The `futures` crate provides
the combinators most projects need, so reach for it before writing one.

A common error message mentions `Pin` when a future is not `Send`:

```text
error: future cannot be sent between threads safely
   = help: consider using `tokio::sync::Mutex` instead of `std::sync::Mutex`
```

The cause is a non `Send` value held across an await, and the fix is to own the data or use the async aware
primitive, not to reach for `Pin`.

## Check yourself

Implement the `Ready` future above and race it against a real `sleep` with `select!`. Then write a wrapper that
delegates `poll` to an inner future with `Pin::new_unchecked` and a `SAFETY` comment, and test it.
