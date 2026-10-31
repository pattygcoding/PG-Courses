---
title: The operator and comparison traits
summary: Overloading arithmetic, ordering values, and the consistency rules the compiler cannot check.
chapter: Traits in depth
minutes: 14
status: draft
---

## Arithmetic is a trait implementation

```rust
use std::ops::Add;

#[derive(Debug, Clone, Copy, PartialEq)]
struct Vec2 {
    x: f64,
    y: f64,
}

impl Add for Vec2 {
    type Output = Vec2;

    fn add(self, other: Vec2) -> Vec2 {
        Vec2 {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}
```

`Add` takes `self` by value, so use `Add for &Vec2` when you want to keep the operands. Everything else is
available the same way: `Sub`, `Mul`, `Div`, `Rem`, `Neg` for the unary minus, and the `*Assign` variants for
`+=` and friends.

```rust
use std::ops::AddAssign;

impl AddAssign for Vec2 {
    fn add_assign(&mut self, other: Vec2) {
        self.x += other.x;
        self.y += other.y;
    }
}
```

Implementing `Add` does not give you `AddAssign`, which is why a type that supports both needs both.

## Equality and ordering

```rust
#[derive(Debug, PartialEq, Eq, PartialOrd, Ord)]
struct Version {
    major: u32,
    minor: u32,
}
```

`PartialEq` gives `==` and `!=`, and `Eq` asserts that equality is reflexive, which is why `f64` has the first
and not the second: `NaN != NaN`. `PartialOrd` gives `<`, `>` and the comparison operators, and `Ord` requires
a total order.

```rust
impl Ord for Version {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        (self.major, self.minor).cmp(&(other.major, other.minor))
    }
}

impl PartialOrd for Version {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}
```

Comparing tuples and returning the result is the shortest correct implementation for a struct with several
fields, and it keeps the field order in one place.

## The rules the compiler cannot check

Deriving `Ord` on an enum follows the declaration order of the variants, so `Low < High` only if `Low` is
declared first. That is convenient and worth knowing before you reorder variants and change behaviour.

Deriving `Hash` and `Eq` together is required for a map key, and the two must agree: if `a == b` then the two
hashes must match, or lookups silently fail. Deriving both on the same struct guarantees it, which is why
hand-writing one of them is a decision to be careful about.

## Default, From and the conversion traits

```rust
#[derive(Debug, Default)]
struct Options {
    threads: usize,
    verbose: bool,
}

impl From<Options> for Vec<String> {
    fn from(options: Options) -> Self {
        let mut args = Vec::new();
        if options.verbose {
            args.push(String::from("--verbose"));
        }
        args
    }
}
```

Implement `From` and you get `Into` for free, which is the reason library constructors take a generic
`impl Into<String>` rather than a concrete type. `TryFrom` is the fallible counterpart, and `FromStr` is what
`str::parse` uses.

## Index and AsRef

```rust
impl std::ops::Index<&str> for Config {
    type Output = String;

    fn index(&self, key: &str) -> &String {
        &self.values[key]
    }
}
```

`Index` makes `config["host"]` work, and it should panic on a missing key rather than return a default, because
the operator cannot report failure. `AsRef<Path>` is the trait to implement for a type that wraps a path, so a
function taking `impl AsRef<Path>` accepts both your type and a `&str`.

## Check yourself

Implement `Add` and `AddAssign` for a struct, and derive or implement `PartialEq`, `Eq` and `Ord` so that
sorting a `Vec` of them gives the order you expect. Then derive `Hash` and use a value as a `HashMap` key.
