---
title: Traits
summary: Shared behaviour with default methods, and the orphan rule that keeps implementations findable.
chapter: Types and data modelling
minutes: 14
status: draft
---

## A trait is a contract

```rust
trait Summary {
    fn title(&self) -> &str;

    fn line(&self) -> String {
        format!("{}: {}", self.title(), self.body())
    }

    fn body(&self) -> &str;
}

impl Summary for Record {
    fn title(&self) -> &str {
        &self.name
    }

    fn body(&self) -> &str {
        &self.kind
    }
}
```

A required method has no body and every implementor has to write it. A provided method has a default body,
and an implementor may override it. Defaults are how a trait grows without breaking the types that already
implement it, which is what a library needs.

## The impl block is the only place behaviour is added

```rust
impl Summary for Vec<String> {
    fn title(&self) -> &str {
        self.first().map(String::as_str).unwrap_or("empty")
    }

    fn body(&self) -> &str {
        ""
    }
}
```

There is no monkey patching and no reopening a type elsewhere. An implementation lives either in the crate
that defines the trait or in the crate that defines the type, which is the orphan rule. It is why the method
is always reachable, and it is why a foreign type needs a newtype wrapper or an extension trait to gain
behaviour you own.

## Supertraits and bounds

```rust
trait Stored: std::fmt::Debug + Send {
    fn id(&self) -> u64;
}

fn log_all<T: Stored>(items: &[T]) {
    for item in items {
        println!("{:?} {}", item, item.id());
    }
}
```

`Stored: Debug + Send` means anything implementing `Stored` also implements those two, so the bound at the
call site can be the short one. That is how a trait states what it needs to do its job.

## Associated types and generic parameters

```rust
trait Parser {
    type Output;

    fn parse(&self, input: &str) -> Self::Output;
}

impl Parser for JsonParser {
    type Output = serde_json::Value;

    fn parse(&self, input: &str) -> Self::Output { /* ... */ }
}
```

An associated type has exactly one value per implementor, so `Parser::Output` names it without a type
parameter at the call site. Use a generic parameter instead when one type could sensibly implement the trait
several times with different parameters, which is how `From<T>` works.

## Blanket implementations

```rust
trait Describe {
    fn describe(&self) -> String;
}

impl<T: std::fmt::Display> Describe for T {
    fn describe(&self) -> String {
        format!("{self}")
    }
}
```

A blanket implementation applies to every type that meets the bound. It is how the standard library gives
`ToString` to everything implementing `Display`, and it is worth adding when your trait is a small wrapper
over an existing one.

## Check yourself

Write a trait with one required method and one provided method, implement it for two types, and override the
provided method in one of them. Then add a trait bound to a generic function and confirm that passing a type
without the implementation fails to compile.
