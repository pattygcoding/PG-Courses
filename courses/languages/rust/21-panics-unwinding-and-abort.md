---
title: Panics, unwinding and abort
summary: What a panic costs, when the compiler inserts one, and the two places it must not escape.
chapter: Error handling
minutes: 13
status: draft
---

## A panic is not an exception

```rust
let values = vec![1, 2, 3];

let item = values[9];             // panics: index out of bounds
let text = "42u32".parse::<u8>().unwrap();   // panics: ParseIntError
```

The default behaviour is to unwind: run the destructors of everything in the current thread, then stop that
thread. The process ends if the panic was on the main thread. That is why a panic is not a way to report a
recoverable failure, and why `Result` exists.

The compiler also inserts panics it knows about: an out of range index, a slice that is not a character
boundary, integer overflow in a debug build, a division by zero, and `expect` on a `None` or an `Err`.

## Assertions state what the code relies on

```rust
fn average(total: u64, count: u64) -> f64 {
    assert!(count > 0, "count must be positive, got {count}");
    debug_assert!(total >= count);

    total as f64 / count as f64
}
```

`assert!` always runs and `debug_assert!` disappears in release. A cheap check that documents an invariant
belongs in `assert!` when the cost is small, because it turns a wrong answer into a clear failure at the point
the assumption broke.

## Profile decides between unwind and abort

```toml
[profile.release]
panic = "abort"
```

`abort` skips unwinding, which makes the binary smaller and gives nothing for `catch_unwind` to catch. Setting
it in release and not in dev means a panic behaves differently in the two profiles, so decide once and write it
down in the manifest rather than discovering it in a test.

## catch_unwind is not error handling

```rust
let result = std::panic::catch_unwind(|| {
    risky_parse(input)
});

match result {
    Ok(value) => println!("{value}"),
    Err(_) => eprintln!("the parser panicked"),
}
```

`catch_unwind` exists for a boundary you do not control, such as a test runner or a plugin host. It requires
the closure to be `UnwindSafe`, which the compiler checks because a value left half modified by a panic is a
real hazard. It is not a substitute for `Result`, since it cannot tell you what went wrong.

## Where a panic must not escape

```rust
#[no_mangle]
pub extern "C" fn process(input: *const u8) -> i32 {
    // a panic that unwinds into C is undefined behaviour
    std::panic::catch_unwind(|| run(input)).unwrap_or(-1)
}
```

An unwind crossing into C or C++ code is undefined behaviour, because the other side has no idea how to
continue. A function called from C must catch its panics and return a status code. The same rule applies in
the other direction: an unwinding C++ exception entering Rust is undefined behaviour too.

## Check yourself

Trigger four different panics, including an out of range index and an unwrap on an `Err`, and read the message
for each. Then set `panic = "abort"` in release, rebuild, and confirm `catch_unwind` no longer reports a
panic.
