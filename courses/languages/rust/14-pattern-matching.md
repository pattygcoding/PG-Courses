---
title: Pattern matching
summary: Destructuring, guards and the shapes that let you pull data apart without indexing anything.
chapter: Types and data modelling
minutes: 14
status: draft
---

## match is exhaustive

```rust
enum Event {
    Started { id: u64 },
    Finished { id: u64, ok: bool },
    Skipped,
}

fn describe(event: &Event) -> String {
    match event {
        Event::Started { id } => format!("started {id}"),
        Event::Finished { id, ok: true } => format!("finished {id}"),
        Event::Finished { id, ok: false } => format!("failed {id}"),
        Event::Skipped => String::from("skipped"),
    }
}
```

Every variant is covered, so adding one breaks the build at this function rather than producing an unhandled
case at run time. Literals work as patterns too, which is why `ok: true` can be a case on its own.

## Patterns destructure rather than index

```rust
let point = (3, 7);
let (x, y) = point;

let Pair { left, right } = pair;
let [first, second, ..] = numbers;
```

A pattern names the parts of a value, including tuple structs, arrays and references. `..` skips what you do
not need, which keeps a pattern readable when a struct has eight fields.

## Ranges, or-patterns, guards and bindings

```rust
match score {
    0 => "nothing",
    1..=59 => "fail",
    60 | 70 | 80 => "round number",
    n if n > 100 => "over the limit",
    n => { println!("{n}"); "ok" }
}
```

`1..=59` is an inclusive range, `|` joins alternatives, and `n if n > 100` adds a condition. A guard can call a
function, which makes it useful for a rule that is not expressible as a pattern. The arms are tried in order,
so a broad arm above a narrow one is dead code and `clippy` says so.

`@` binds and matches at once:

```rust
match age {
    n @ 13..=19 => println!("teenager, {n} years old"),
    _ => {}
}
```

## let else for the early exit

```rust
fn host(record: &Record) -> &str {
    let Some(connection) = &record.connection else {
        return "none";
    };

    &connection.host
}
```

`let ... else` runs the block when the pattern does not match, and that block must diverge with a `return`,
`break`, `continue` or panic. It replaces a nested `if let` with the happy path at one indent level, which is
the shape you want in a long function.

## if let and while let for one case

```rust
if let Some(width) = config.width {
    println!("{width}");
}

while let Some(line) = lines.next() {
    println!("{line}");
}

let is_reply = matches!(frame, Frame::Reply { .. });
```

`matches!` is the readable way to write a boolean test about a variant, and it compiles to the same code as a
`match` with two arms.

## Matching references

```rust
for item in &items {
    match item {
        Config::Text(value) => println!("{value}"),   // value is &String here
        Config::Flag => {}
    }
}
```

Matching against a reference binds by reference, so `value` is a `&String` without writing `&` in the pattern.
Writing `ref` or `&` explicitly is only needed when the binding mode is not what you want, and `clippy` will
tell you when the extra syntax is redundant.

## Check yourself

Write a `match` over an enum with a range arm, an or-pattern, a guard and a catch-all, then add a variant and
confirm the compiler points at every place that needs a new arm. Rewrite one of the arms as a `let ... else`
and compare the indentation.
