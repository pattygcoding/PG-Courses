---
title: Primitive types, casts and conversions
summary: The built-in types, why as is blunt, and the conversion traits that carry the failure in the type.
chapter: Types and data modelling
minutes: 13
status: draft
---

## The built-in types

| Group | Types |
| --- | --- |
| Signed integers | `i8`, `i16`, `i32`, `i64`, `i128`, `isize` |
| Unsigned integers | `u8`, `u16`, `u32`, `u64`, `u128`, `usize` |
| Floating point | `f32`, `f64` |
| Other | `bool`, `char`, `()`, arrays, tuples, slices |

`i32` and `f64` are the defaults when a literal's type is undecided, and `usize` is the type for lengths and
indices. Literals take separators and suffixes:

```rust
let million = 1_000_000u32;
let bytes: [u8; 4] = [0xDE, 0xAD, 0xBE, 0xEF];
let letter = 'A';       // char: one Unicode scalar value
let unit = ();          // the empty tuple, a value that carries nothing
```

## There is no implicit conversion

```rust
let small: u8 = 5;
let wide: u32 = small;             // error: mismatched types

let wide: u32 = u32::from(small);  // explicit, and lossless
```

Rust does not widen an integer for you, so a conversion is always visible in the source. That is noisy for a
few lines and saves an afternoon when a type that looked like a `u32` turns out to be a `u16`.

## as is the blunt instrument

```rust
let big: u64 = 300;
let small = big as u8;             // 44, truncated: 300 % 256

let negative: i32 = -1;
let wrapped = negative as u32;     // 4294967295
```

`as` truncates or wraps with no error and no warning. It is right for a deliberate bit pattern and wrong for
a value a user supplied, and the two look identical in a diff.

## From, Into, TryFrom and TryInto

```rust
let count: i32 = 7;
let wide: i64 = i64::from(count);     // infallible
let doubled: i64 = count.into();       // Into comes free with From
let back: Result<i32, _> = i32::try_from(wide);   // fallible
```

Implementing `From<A> for B` gives you `Into<B> for A` for nothing, which is why libraries implement `From`
and callers write `.into()`. `TryFrom` is for conversions that can fail, so the possibility of failure is in
the signature rather than in a comment.

## Checked arithmetic for values from outside

```rust
let a: u8 = 250;
let b: u8 = 10;

println!("{:?}", a.checked_add(b));     // None
println!("{}", a.saturating_add(b));    // 255
println!("{}", a.wrapping_add(b));      // 4
let (value, overflowed) = a.overflowing_add(b);
```

`checked_*` returns an `Option`, `saturating_*` clamps at the bound, `wrapping_*` wraps, and `overflowing_*`
returns the value plus a flag. Naming which behaviour you want is the difference between a documented result
and a bug report about a build profile.

## Choosing the type

```rust
fn average(total: u64, count: u64) -> f64 {
    total as f64 / count as f64
}
```

Use `f64` for a measurement and an integer for a count or an index. Pick the narrowest integer that cannot
overflow for the values you expect, and reach for `checked_add` at the point where the value comes from a
file, a network response, or a user.

## Check yourself

Write a function taking `u16` and returning `u8`, once with `as` and once with `TryFrom`. Call both with 300
and record the two results. Then decide which one you would ship and say why.
