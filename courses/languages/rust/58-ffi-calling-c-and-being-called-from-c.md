---
title: FFI, calling C and being called from C
summary: Representing data across the boundary, who owns memory, and why a panic must not escape.
chapter: Advanced and the edges
minutes: 15
status: draft
---

## Declaring an external function

```rust
use std::ffi::{c_char, c_int, CStr};

unsafe extern "C" {
    fn getenv(name: *const c_char) -> *mut c_char;
}

fn home() -> Option<String> {
    let name = c"HOME";

    // SAFETY: the name is a valid NUL terminated string and getenv does not retain it
    let value = unsafe { getenv(name.as_ptr()) };

    if value.is_null() {
        return None;
    }

    // SAFETY: getenv returned a valid NUL terminated string
    let text = unsafe { CStr::from_ptr(value) };
    Some(text.to_string_lossy().into_owned())
}
```

`extern "C"` declares a function implemented elsewhere, and the block is unsafe because the compiler cannot check
the signature against the real one. `c"..."` is a C string literal, and `CStr` wraps a NUL terminated pointer for
conversion into a `String`. Text coming from C is not a `&str`, because a `&str` requires known length and valid
UTF-8, neither of which C promises.

## Linking

```rust
#[link(name = "z")]
unsafe extern "C" {
    fn compress2(
        dest: *mut u8,
        dest_len: *mut u64,
        source: *const u8,
        source_len: u64,
        level: c_int,
    ) -> c_int;
}
```

`#[link(name = "z")]` tells the linker to link `libz`. A build script covers the cases a link attribute cannot:

```rust
// build.rs
fn main() {
    cc::Build::new()
        .file("csrc/helper.c")
        .include("csrc")
        .compile("helper");

    println!("cargo::rerun-if-changed=csrc/helper.c");
}
```

The `cc` crate compiles the C source and the `rerun-if-changed` line keeps Cargo from rebuilding when nothing
changed. Header driven bindings are generated with `bindgen`, which parses the header and emits the declarations,
and the result should be committed so a build does not require `libclang`.

## Structs across the boundary

```rust
#[repr(C)]
pub struct Header {
    pub version: u8,
    pub kind: u8,
    pub length: u32,
}

unsafe extern "C" {
    fn read_header(buffer: *const u8, out: *mut Header) -> c_int;
}
```

`#[repr(C)]` is required, because the default layout gives no promise about field order or padding. An enum with
`#[repr(u8)]` and no payload is also layout compatible. A Rust enum with data is not, so it must be passed as an
opaque pointer or converted to a plain struct.

## Strings, ownership and who frees

```rust
use std::ffi::CString;

fn set_name(name: &str) -> Result<(), std::ffi::NulError> {
    let name = CString::new(name)?;

    // SAFETY: the pointer is valid for the duration of the call and the callee copies it
    unsafe { set_name_impl(name.as_ptr()) };

    Ok(())
}
```

The rule that prevents most leaks and double frees: whoever allocates, frees. A Rust function that returns a
pointer to a `CString` must also export a function that takes it back and drops it. Document which side owns what
in the `# Safety` section of every exported function, because the compiler will not check it.

```rust
#[unsafe(no_mangle)]
pub extern "C" fn records_free(records: *mut Record, len: usize) {
    if records.is_null() {
        return;
    }

    // SAFETY: the pointer came from records_new with this length
    unsafe { drop(Box::from_raw(std::slice::from_raw_parts_mut(records, len))) };
}
```

In Rust 2024 the `no_mangle` attribute is written `#[unsafe(no_mangle)]`, which marks it as an assertion that the
name does not collide.

## Panics and unwinding

```rust
#[unsafe(no_mangle)]
pub extern "C" fn process(ptr: *const u8, len: usize) -> c_int {
    let Some(input) = (unsafe { std::slice::from_raw_parts(ptr, len).first() }) else {
        return -1;
    };

    std::panic::catch_unwind(|| run(*input)).unwrap_or(-2)
}
```

An unwind crossing into C is undefined behaviour, so every exported function either cannot panic or catches it.
`catch_unwind` is the tool; a status code is the report. The reverse holds too: an exception thrown by C++ into
Rust is undefined behaviour unless the boundary is marked `extern "C-unwind"` on both sides.

## Check yourself

Call one function from a system C library, wrap it in a safe Rust function with a documented safety contract, and
return a `Result`. Then export a Rust function that takes a slice as pointer and length, returns a status code, and
catches its own panics.
