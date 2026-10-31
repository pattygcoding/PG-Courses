---
title: Display, Debug and formatting
summary: Two rendering traits with different audiences, and the format specifiers worth memorising.
chapter: Traits in depth
minutes: 12
status: draft
---

## Debug is for you, Display is for the user

```rust
#[derive(Debug)]
struct Record {
    name: String,
    size: u64,
}

println!("{:?}", record);    // Record { name: "a", size: 1 }
println!("{record:#?}", record);   // the same, indented over several lines
```

`Debug` is derived almost always, and it is what an assertion, a panic message and `unwrap` print. `Display` is
implemented on purpose, because it is the representation a person reads:

```rust
use std::fmt;

impl fmt::Display for Record {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} ({} bytes)", self.name, self.size)
    }
}
```

`write!` into the formatter is the only way to implement it, and returning its `Result` is correct: the
formatter can fail when the underlying writer fails.

## The formatter carries the flags

```rust
println!("{:>10}|", record.name);     // right aligned in a width of 10
println!("{:<10}|", record.name);     // left aligned
println!("{:^10}|", record.name);     // centred
println!("{:.2}", 3.14159);           // two decimal places
println!("{:08}", 42);                // zero padded
println!("{:#x}", 255);               // 0xff
println!("{:#010b}", 5);              // 0b00000101
```

`Display` decides what the value looks like; the format spec decides the padding, width and precision around it.
A type that implements `Display` gets all of those for nothing, which is a reason to implement it rather than
format by hand in the caller.

## Debug builders for a struct

```rust
impl fmt::Debug for Parser {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Parser")
            .field("position", &self.position)
            .field("input_len", &self.input.len())
            .finish()
    }
}
```

Deriving `Debug` prints every field, which is sometimes too much or leaks a secret such as a token. The debug
builders print the fields you choose in the same shape, so the output still looks like the derived form.

## Other formatting traits

```rust
println!("{:b} {:o} {:x} {:X}", 10, 10, 255, 255);
println!("{:e}", 1234.5);
println!("{:p}", &record);              // a pointer address
println!("{value}");                    // Display by default
```

The numeric traits are `Binary`, `Octal`, `LowerHex` and `UpperHex`, and they are what a byte dump or a checksum
display uses. Implementing one of them for a new type is a small job and makes the type usable in a hex dump
alongside integers.

## String formatting allocates

```rust
let message = format!("{name}: {size}");

let mut buffer = String::with_capacity(64);
use std::fmt::Write;
write!(buffer, "{name}: {size}")?;
```

`format!` builds a new `String` every call. A logging path that runs in a hot loop writes into a reused buffer
instead, and `println!` has the same cost as `format!` for the same reason.

## Check yourself

Implement `Display` for a struct with a numeric field, print it with width and precision specifiers, and add a
custom `Debug` with the debug builders that hides one field. Then print the same value with `{:x}` after
implementing `LowerHex`.
