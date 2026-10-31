---
title: Procedural macros
summary: Derive, attribute and function-like macros, the crates that write them, and the compile time they cost.
chapter: Advanced and the edges
minutes: 14
status: draft
---

## Three kinds, one crate type

```toml
[lib]
proc-macro = true

[dependencies]
syn = { version = "2", features = ["full"] }
quote = "1"
proc-macro2 = "1"
```

```rust
use proc_macro::TokenStream;

#[proc_macro_derive(Describe)]
pub fn describe(input: TokenStream) -> TokenStream {
    // receives the item the derive is attached to
    input
}

#[proc_macro_attribute]
pub fn timed(attr: TokenStream, item: TokenStream) -> TokenStream {
    // receives the attribute arguments and the item
    item
}

#[proc_macro]
pub fn sql(input: TokenStream) -> TokenStream {
    // receives whatever is between the delimiters
    input
}
```

A procedural macro receives tokens and returns tokens, so it can inspect the item, call the network, read a file,
or generate code that no `macro_rules!` pattern could express. It has to live in its own crate with
`proc-macro = true`, because the compiler loads it as a plugin.

## A derive, step by step

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(Describe)]
pub fn describe(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    let name = &input.ident;
    let name_text = name.to_string();

    quote! {
        impl Describe for #name {
            fn describe(&self) -> &'static str {
                #name_text
            }
        }
    }
    .into()
}
```

`syn` parses the tokens into a typed syntax tree, `quote!` builds tokens back, and `#name` interpolates a variable
from the surrounding Rust code into the generated tokens. The `#name_text` form is the string literal case, which
is how you bake the type's name into the implementation.

## Reporting an error properly

```rust
use syn::Error;

#[proc_macro_derive(Describe, attributes(describe))]
pub fn describe(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    if !input.generics.params.is_empty() {
        return Error::new_spanned(
            &input.generics,
            "Describe cannot be derived for a generic type",
        )
        .to_compile_error()
        .into();
    }

    // ...
}
```

Returning tokens that are a `compile_error!` invocation makes the compiler report the message at the right span,
so the user sees a marker under the generic parameters rather than a wall of errors somewhere else. Getting the
span right is most of the work in a good procedural macro.

## Testing one

```rust
#[test]
fn fails_on_a_generic_type() {
    let output = describe(generic_input());

    assert!(output.to_string().contains("cannot be derived"));
}
```

A macro is a function from tokens to tokens, so a unit test can call it directly and assert on the output. For the
end to end behaviour, the `trybuild` crate compiles a set of passing and failing files and compares the compiler
output, which is how a macro with careful error messages is tested.

## What it costs

A procedural macro is compiled and run during the build of every crate that uses it, and its dependencies such as
`syn` and `quote` are compiled too. That is a real cost in build time, and it is why a crate with many derives
takes longer to build than its line count suggests. `cargo build --timings` shows where the time goes.

## Choosing between the three options

A generic function with a trait bound is the first choice, because it is type checked as ordinary code. A
`macro_rules!` macro is the second, for a repetition the type system cannot express. A procedural macro is for
when the code has to be generated from the shape of an item: a derive for a trait with boilerplate, a test
generator, a schema binding. It is the most powerful and the most expensive, and it is worth having a reason
beyond preference.

## Check yourself

Write a derive macro that implements one method for a struct, test it from a unit test by calling the function
directly, and then add an error for a case you want to reject. Look at where the compiler places the message.
