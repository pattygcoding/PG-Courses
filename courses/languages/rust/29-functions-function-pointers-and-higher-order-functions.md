---
title: Functions, function pointers and higher-order functions
summary: Passing behaviour as a value, and choosing between a generic parameter and a boxed closure.
chapter: Traits in depth
minutes: 13
status: draft
---

## A function is a value

```rust
fn double(value: i32) -> i32 {
    value * 2
}

let values = vec![1, 2, 3];
let doubled: Vec<i32> = values.iter().copied().map(double).collect();
```

A function item has a type of its own and coerces to a function pointer `fn(i32) -> i32` where one is expected.
Function pointers are `Copy`, so they can be stored in a struct and duplicated without a closure type to name.

```rust
type Rule = fn(&str) -> bool;

struct Validator {
    rules: Vec<Rule>,
}

let validator = Validator {
    rules: vec![|text: &str| !text.is_empty(), |text: &str| text.len() < 80],
};
```

A closure that captures nothing coerces to a function pointer. One that captures cannot, because a pointer
carries no state.

## Method references read better than a closure

```rust
let trimmed: Vec<&str> = lines.iter().map(|line| line.trim()).collect();
let spelled: Vec<&str> = lines.iter().map(str::trim).collect();

let total: usize = words.iter().map(String::len).sum();
```

`str::trim` and `String::len` name the method as a function, so there is one less parameter to read. It works
for any method that takes `&self` or `self` as the first argument.

## Generic parameter or trait object

```rust
fn run_each<F: Fn(i32) -> i32>(values: &[i32], f: F) -> Vec<i32> {
    values.iter().copied().map(f).collect()
}

fn run_each_boxed(values: &[i32], f: &dyn Fn(i32) -> i32) -> Vec<i32> {
    values.iter().copied().map(f).collect()
}
```

The generic version is monomorphised, so the closure is inlined and the call costs nothing. The `dyn` version
takes a pointer and goes through a vtable, and it accepts a closure whose concrete type the caller does not
want to expose. A library usually offers the generic form, because the caller can box the closure themselves
if they need to.

## Behaviour stored in a struct

```rust
struct Processor<F>
where
    F: Fn(&Entry) -> bool,
{
    keep: F,
}

impl<F: Fn(&Entry) -> bool> Processor<F> {
    fn run<'a>(&self, entries: &'a [Entry]) -> Vec<&'a Entry> {
        entries.iter().filter(|entry| (self.keep)(entry)).collect()
    }
}
```

A generic field means the struct has a type parameter and every use names it, which is fine when one processor
holds one rule. A `Vec<Box<dyn Fn(&Entry) -> bool>>` is the answer when the rules are collected at run time,
which is what a plugin or a config driven filter needs.

## Higher-order helpers the standard library already has

```rust
let maybe: Option<i32> = Some(3);
let doubled = maybe.map(|value| value * 2);

let parsed: Result<i32, _> = "7".parse().map(|value| value + 1);

let or_default = maybe.unwrap_or_else(|| compute_default());
```

`Option`, `Result` and `Iterator` all take closures, so most code that would be a small helper function is a
method call instead. Check the method list of the type before writing a function around it.

## Check yourself

Write a function taking `impl Fn(i32) -> i32` and call it with a named function, a non-capturing closure, and a
capturing closure. Then change the bound to `&dyn Fn(i32) -> i32` and note which of the three call sites now
needs a box.
