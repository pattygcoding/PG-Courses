---
title: Accepting flexible input with AsRef, Borrow and Cow
summary: Signatures that take more than one type, and the enum that avoids a clone when nothing changed.
chapter: Lifetimes and smart pointers
minutes: 13
status: draft
---

## AsRef for a parameter that can be several things

```rust
fn read_all(path: impl AsRef<std::path::Path>) -> std::io::Result<String> {
    std::fs::read_to_string(path.as_ref())
}

read_all("config.toml");
read_all(std::path::Path::new("/etc/hosts"));
read_all(std::path::PathBuf::from("data/input.csv"));
```

`AsRef<Path>` accepts a `&str`, a `String`, a `Path` and a `PathBuf`, so one function covers every caller. The
same trick works for text:

```rust
fn hash(name: impl AsRef<str>) -> u64 {
    use std::hash::{Hash, Hasher};

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    name.as_ref().hash(&mut hasher);
    hasher.finish()
}
```

Use `impl AsRef<T>` when the function immediately reborrows the value anyway. Use a generic parameter with an
explicit `where` clause when you need the bound in more than one place.

## Borrow for map keys

```rust
use std::collections::HashMap;

let mut counts: HashMap<String, u32> = HashMap::new();
counts.insert(String::from("ada"), 1);

println!("{:?}", counts.get("ada"));    // Some(&1), no String allocated
```

`HashMap::get` takes `&Q` where the key implements `Borrow<Q>`. `String` implements `Borrow<str>`, so a `&str`
can look up a `String` key. That is why the lookup above does not allocate, and it is the reason to implement
`Borrow` rather than `AsRef` for a newtype used as a key.

## Cow for the value that may or may not change

```rust
use std::borrow::Cow;

fn normalise(input: &str) -> Cow<'_, str> {
    if input.contains('\t') {
        Cow::Owned(input.replace('\t', "    "))
    } else {
        Cow::Borrowed(input)
    }
}

match normalise(line) {
    Cow::Borrowed(text) => println!("unchanged: {text}"),
    Cow::Owned(text) => println!("rewritten: {text}"),
}
```

`Cow<'a, str>` is `Borrowed(&'a str)` or `Owned(String)`. The function returns a borrow when nothing changed and
allocates only when it did, which matters in a loop over a large file where most lines are already fine.
`Cow<'a, [T]>` does the same for a slice.

Deref makes the two variants look the same at the call site, since `normalise(line).len()` works on both.

## Pushing ownership to the edge of the program

```rust
fn parse_record(line: &str) -> Record {
    Record {
        name: line[..8].trim().to_owned(),
        size: line[8..].trim().parse().unwrap_or(0),
    }
}
```

A parser takes borrowed input and returns owned values. That keeps the lifetimes out of every function in the
middle of the program, where the data is passed around and stored, and confines them to the boundary where the
text arrives.

## Check yourself

Write one function taking `impl AsRef<str>` and call it with a `&str`, a `String` and a `&String`. Then write a
normaliser returning `Cow<'_, str>` and confirm with two inputs that one allocates and one does not.
