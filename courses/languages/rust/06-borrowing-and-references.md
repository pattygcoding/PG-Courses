---
title: Borrowing and references
summary: Lending a value without giving it away, and the aliasing rule that rules out data races.
chapter: Ownership and borrowing
minutes: 14
status: draft
---

## A reference lends the value

```rust
fn size(text: &str) -> usize {
    text.len()
}

fn main() {
    let text = String::from("hello");
    let bytes = size(&text);

    println!("{text} is {bytes} bytes long");
}
```

`&text` borrows the value for the duration of the call. The owner keeps ownership, the borrow ends when the
function returns, and `text` is untouched. A function that only reads its argument should almost always take
a reference, because that leaves the caller free to keep using the value.

## One mutable borrow, or any number of shared ones

```rust
let mut text = String::from("hello");

let first = &text;
let second = &text;
println!("{first} {second}");

let writer = &mut text;
writer.push('!');
```

Several readers at once are fine, and one writer at a time is fine. Both at once is not:

```rust
let mut text = String::from("hello");
let reader = &text;
let writer = &mut text;   // error: cannot borrow as mutable because it is also borrowed as immutable

println!("{reader}");
```

That rule is what makes a data race impossible without a lock, and it is checked at compile time rather than
discovered in production. The fix is to finish with the reader before taking the writer, which usually means
moving one line.

## Borrows end at their last use

```rust
let mut values = vec![1, 2, 3];
let first = &values[0];

println!("{first}");

values.push(4);   // allowed: the borrow above is over
```

A borrow lasts until its last use rather than until the end of the block, so the rule is far less
restrictive than the phrasing suggests. Most "cannot borrow as mutable" errors disappear when the read moves
closer to where the value is needed.

## A reference cannot outlive what it points at

```rust
fn dangling() -> &String {
    let local = String::from("gone");
    &local
}
```

```text
error[E0106]: missing lifetime specifier
```

The compiler refuses to return a reference to a local, because the buffer is freed when the function ends.
Returning an owned `String`, or taking a reference in and handing one back, are the two ways forward. The
next lessons cover both.

## Reborrowing keeps the API flexible

```rust
fn shout(text: &str) -> String {
    text.to_uppercase()
}

let owned = String::from("hello");
shout(&owned);        // &String becomes &str
shout(&owned[..2]);   // a slice works too
```

`&mut T` can also be reborrowed as a shorter `&mut T`, which is why passing a mutable reference to a function
that takes one does not consume it:

```rust
fn append(text: &mut String) {
    text.push('!');
}

let mut text = String::from("hi");
append(&mut text);
append(&mut text);
```

## Check yourself

Write a function that appends to a `&mut String`, call it twice, then hold an immutable reference across both
calls and read the error. For each error, move one line so the compiler accepts it and note how little had
to change.
