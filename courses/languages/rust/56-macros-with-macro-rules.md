---
title: Macros with macro_rules
summary: Matching token trees, repeating with @ and *, and writing one that reads like a feature of the language.
chapter: Advanced and the edges
minutes: 14
status: draft
---

## A declarative macro matches syntax

```rust
macro_rules! unless {
    ($condition:expr, $body:block) => {
        if !$condition $body
    };
}

unless!(value > 10, {
    println!("small");
});
```

`macro_rules!` takes a list of patterns and a body for each. `$name:expr` matches an expression, and the body
splices it back into the generated code. The macro runs before type checking, so it operates on tokens rather than
on values.

The fragment specifiers are `expr`, `ident`, `ty`, `literal`, `path`, `pat`, `block`, `stmt`, `item` and `tt`. `tt`
matches one token tree, which is the escape hatch when no other fragment fits.

## Repetition

```rust
macro_rules! hash_map {
    ($($key:expr => $value:expr),* $(,)?) => {{
        let mut map = std::collections::HashMap::new();
        $( map.insert($key, $value); )*
        map
    }};
}

let scores = hash_map! {
    "ada" => 7,
    "grace" => 9,
};
```

`$( ... )*` repeats the enclosed tokens for each match of the repetition, and `$(,)?` allows an optional trailing
comma. The extra braces around the body make it a block expression, so the `let` inside does not leak into the
caller.

## Multiple rules and recursion

```rust
macro_rules! min {
    ($first:expr) => { $first };
    ($first:expr, $($rest:expr),+) => {
        std::cmp::min($first, min!($($rest),+))
    };
}
```

The first rule stops the recursion and the second strips one argument at a time. Rules are tried in order, so the
single argument case must come first or the second pattern will swallow it.

## Hygiene

```rust
macro_rules! double {
    ($value:expr) => {{
        let doubled = $value * 2;
        doubled
    }};
}

let doubled = 10;
println!("{}", double!(doubled));
```

The `doubled` introduced by the macro is in its own syntax context, so it does not collide with the caller's
variable of the same name. Identifiers passed in from the caller keep their context. That is why a macro can use a
plain name for an internal variable without prefixing it.

`$crate` names the defining crate from inside the expansion, so a macro exported from a library refers to the
library's own items no matter what the caller has imported:

```rust
#[macro_export]
macro_rules! make_default {
    () => { $crate::Config::default() };
}
```

## When to write one

A macro earns its place when a caller would otherwise repeat a shape that the type system cannot express, or when
the repetition has to happen at compile time. `vec!`, `println!`, `assert_eq!` and `matches!` are all this.

It is the wrong tool when a function or a generic would do, because a macro is harder to read, harder to debug,
and produces error messages that point at the expansion rather than at your code. If a generic function with a
trait bound expresses it, use the function.

```rust
macro_rules! define_id {
    ($name:ident) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
        pub struct $name(u64);
    };
}

define_id!(UserId);
define_id!(OrderId);
```

That is the case macros are good at: generating the same small type with a different name, where a generic would
not give each one a distinct type.

## Check yourself

Write a `macro_rules!` macro that accepts one or more expressions and returns the largest, supporting both a
single argument and a list. Call it with one, two and five arguments, then add a trailing comma case and confirm
it still compiles.
