---
title: Slices, str and String
summary: Two string types with one reason, and the borrowed view that generalises to every sequence.
chapter: Ownership and borrowing
minutes: 13
status: draft
---

## String owns, str borrows

```rust
let owned: String = String::from("hello");
let borrowed: &str = &owned[..];
let literal: &str = "baked into the binary";
```

`String` owns a growable buffer on the heap. `&str` is a view into text that lives somewhere else: a
`String`, a literal, or a slice of another `&str`. A function that only reads text should take `&str`,
because that signature accepts all three.

```rust
fn shout(text: &str) -> String {
    text.to_uppercase()
}
```

## Deref coercion does the conversion

```rust
let owned = String::from("hello");

shout(&owned);          // &String coerces to &str
shout(owned.as_str());  // the explicit form, same result
```

`String` implements `Deref<Target = str>`, so `&String` becomes `&str` wherever a `&str` is expected. The
same mechanism turns `&Vec<T>` into `&[T]` and `&Box<T>` into `&T`, which is why a well chosen parameter type
keeps call sites short.

## A slice is a pointer and a length

```rust
let values = vec![10, 20, 30, 40, 50];

let middle: &[i32] = &values[1..4];
let head: &[i32] = &values[..2];
let tail: &[i32] = &values[3..];
```

A slice borrows a contiguous run and carries its own length, so an index into it cannot run past the end
without a panic that names the length. Taking `&[T]` in a parameter means the function works for a `Vec<T>`,
an array and any other slice.

## Why indexing a string does not compile

```rust
let text = String::from("héllo");

let first = text.as_bytes()[1];     // a byte
let count = text.chars().count();   // characters
let bytes = text.len();             // bytes
```

Text is UTF-8, so one character can be one to four bytes and an index would have to mean a byte position
that may fall inside a character. The compiler refuses `text[0]` rather than letting you split a character
and produce invalid text later.

```rust
for character in text.chars() {
    println!("{character}");
}
```

Reach for `chars` to walk characters, `bytes` to walk raw bytes, and `char_indices` when both matter. Slicing
by byte index is allowed only where you have checked the boundary is a character boundary.

## Check yourself

Write a function taking `&[i32]` and call it with a `Vec`, an array and a slice of a slice. Then print the
character count and the byte length of a string containing one accented letter and explain the difference.
