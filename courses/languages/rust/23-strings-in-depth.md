---
title: Strings in depth
summary: Building, splitting, parsing and formatting text, and when to stop using String at all.
chapter: Collections and iterators
minutes: 13
status: draft
---

## Building text

```rust
let mut report = String::with_capacity(256);

report.push_str("name: ");
report.push_str(&record.name);
report.push('\n');

let line = format!("{} {} bytes", record.name, record.size);
```

`push_str` appends without allocating when the capacity allows, and `format!` builds a new `String`. Prefer
`format!` for a short line and `write!` into a buffer when the same buffer is reused in a loop:

```rust
use std::fmt::Write;

let mut report = String::new();
for record in &records {
    writeln!(report, "{} {}", record.name, record.size)?;
}
```

`write!` returns a `Result` because the `Write` trait covers files and sockets as well, where a write can fail.
The `use std::fmt::Write` line is required, because that trait is not in the prelude.

## Splitting and trimming

```rust
let line = "  name = value  ";

let trimmed = line.trim();
let parts: Vec<&str> = trimmed.split('=').map(str::trim).collect();
let key = parts[0];

for token in line.split_whitespace() { /* ... */ }
```

`split` returns borrowed pieces of the original, so there is no allocation per field. `trim` returns a slice
with the whitespace removed, and `lines` splits on newlines while handling a trailing newline correctly.

## Searching and replacing

```rust
let text = "the quick brown fox";

let found = text.contains("quick");
let position = text.find("brown");              // Option<usize>, a byte index
let replaced = text.replace("quick", "slow");
let prefix = text.starts_with("the");
```

`find` returns a byte index, which is the position of the first byte of the match. Slicing around it is safe
because the match starts on a character boundary.

## Converting and validating

```rust
let parsed: u32 = "42".trim().parse()?;
let rendered = 42.to_string();

let bytes = text.into_bytes();
let back = String::from_utf8(bytes)?;             // validates
let relaxed = String::from_utf8_lossy(&bytes);    // replaces invalid runs
```

`parse` is generic over the target type, so it needs inference or a turbofish. `from_utf8` rejects invalid
bytes and `from_utf8_lossy` substitutes the replacement character, which is the right choice when displaying
data that may be corrupt.

## Display, Debug and the escape you need

```rust
println!("{name}");        // Display
println!("{name:?}");      // Debug
println!("{name:>10}");    // padded to width 10
println!("{value:.2}");    // two decimal places
```

`Display` is for a user, `Debug` is for a developer and is what `unwrap` and assertions print. Deriving `Debug`
is nearly always right; implementing `Display` is a deliberate choice to give a type a readable rendering.

## When String is the wrong type

A path is not text: `PathBuf` and `Path` handle separators and non-UTF-8 names on every platform. Environment
values and command line arguments arrive as `OsString` for the same reason. Convert to `String` only when you
have checked the bytes are UTF-8, and keep the path types through the file handling code where they belong.

## Check yourself

Parse a two column text file into a `Vec` of owned structs, trimming and splitting borrowed pieces and
allocating once per field. Print the parsed records with `Debug`, then implement `Display` for the struct and
print them again.
