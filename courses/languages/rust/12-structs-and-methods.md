---
title: Structs and methods
summary: Named data, constructors that validate, and the derive list most types should carry.
chapter: Types and data modelling
minutes: 13
status: draft
---

## Fields and the shorthand

```rust
struct Record {
    name: String,
    size: u64,
    tags: Vec<String>,
}

let name = String::from("report");
let record = Record {
    name,               // shorthand: the field takes the variable's name
    size: 128,
    tags: Vec::new(),
};
```

A struct is a named product type: it has every field, always. There is no null field and no missing key, so
reading `record.name` cannot fail.

## An invariant lives in a constructor

```rust
impl Record {
    fn new(name: impl Into<String>, size: u64) -> Self {
        Self {
            name: name.into(),
            size,
            tags: Vec::new(),
        }
    }

    fn is_empty(&self) -> bool {
        self.size == 0
    }
}
```

Fields are private outside the module, so a caller has to go through `new`. That is the place to check the
invariant the rest of the type relies on: a non-empty name, a size within range, a sorted list. Taking
`impl Into<String>` accepts both `&str` and `String` without a generic parameter at the call site.

## Methods, associated functions and impl blocks

```rust
impl Record {
    fn size_in_kb(&self) -> f64 {
        self.size as f64 / 1024.0
    }

    fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }
}
```

`size_in_kb` takes `&self`, so it reads without consuming. `with_tags` takes `self` and returns `Self`, which
is the builder shape that chains. A method taking `&mut self` changes the value in place. A function without
`self` is called as `Record::new` and is not a method.

Several `impl` blocks for one type are allowed, which is a common way to separate a trait implementation from
the inherent methods.

## Other shapes

```rust
struct Metres(f64);          // tuple struct: unnamed fields with a type name
struct Unit;                 // unit struct: no fields, useful as a marker

let distance = Metres(3.5);
println!("{}", distance.0);
```

A tuple struct gives a distinct type to a value that would otherwise be a bare `f64`, so a function taking
`Metres` cannot be called with seconds by accident. A unit struct is useful as a type parameter marker or as
an error type with nothing in it.

## The derive list worth defaulting to

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash, Default)]
struct Record {
    name: String,
    size: u64,
    tags: Vec<String>,
}
```

`Debug` is what `{:?}` needs and is close to mandatory. `PartialEq` makes `==` work in tests. `Clone` is worth
adding when the type is cheap to duplicate and not when it owns something large. `Default` gives `..Default::default()`
for constructing one. `Hash` and `Eq` are needed to use the type as a map key. Add `Copy` only when a bitwise
copy is correct, which excludes anything holding a `String` or a `Vec`.

```
error[E0382]: use of moved value: `record`
```

That error usually means a struct was passed where a reference was intended, so check whether the parameter
should be `&Record`.

## Check yourself

Write a struct with a private field and a constructor that rejects an invalid value, derive `Debug` and
`PartialEq`, and write a test asserting that the constructor fails as expected. Then add a builder method and
chain two of them.
