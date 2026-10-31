---
title: Modules and visibility
summary: Growing a project past one file, controlling what the crate exposes, and re-exporting a tidy API.
chapter: Modules, tooling and packaging
minutes: 13
status: draft
---

## The file layout follows the module tree

```text
src/
  lib.rs
  parser.rs
  parser/
    token.rs
    error.rs
  cli.rs
```

```rust
// lib.rs
pub mod cli;
pub mod parser;
```

```rust
// parser.rs
pub mod error;
pub mod token;

pub use error::ParseError;
pub use token::Token;

pub fn parse(input: &str) -> Result<Vec<Token>, ParseError> { /* ... */ }
```

A module declared in `lib.rs` reads `parser.rs`, and a module declared inside `parser.rs` reads either
`parser/token.rs` or `parser/token/mod.rs`. The 2018 and later style puts the parent next to the directory, which
keeps a short module in one shallow file rather than forcing every one into its own folder.

## Visibility is private by default

```rust
pub struct Config {
    pub name: String,
    host: String,
}

pub(crate) fn internal_helper() {}

pub(super) fn for_the_parent() {}

pub(in crate::parser) fn for_the_parser() {}
```

`pub` exposes an item outside the crate. `pub(crate)` limits it to the crate, which is what most internal
helpers should be. `pub(super)` reaches the parent module and `pub(in path)` names any ancestor. A private field
in a public struct keeps its invariant to the crate, so callers have to use the constructor.

`pub use` re-exports an item at the current path, which is how a crate publishes a tidy surface over a deep
module tree. Callers then write `mycrate::Token` instead of `mycrate::parser::token::Token`.

## Imports

```rust
use std::collections::HashMap;
use std::collections::hash_map::Entry;
use std::fmt::{self, Display};
use crate::parser::{self, Token};
use crate::parser::*;
```

A turbofish on a wildcard is not allowed and a wildcard import hides where a name came from, so it belongs in a
tests module or a prelude. A crate that offers a prelude publishes one module the caller imports with a single
wildcard, which is a deliberate use of the pattern.

## Keep the surface small

```rust
#![warn(missing_docs)]
#![deny(missing_debug_implementations)]
```

An item that is `pub` is a promise: changing it breaks downstream users. The cheap way to keep that promise
manageable is to make things `pub(crate)` until a caller needs them, and to add the lint above so every public
item carries a doc comment.

## Test modules live with the code

```rust
pub fn normalise(input: &str) -> String {
    input.trim().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_and_lowers() {
        assert_eq!(normalise("  Ada  "), "ada");
    }
}
```

`#[cfg(test)]` keeps the module out of a normal build, and `use super::*` gives the tests access to private items
in the same module. A test of a private function belongs here; a test of the public API belongs in `tests/`.

## Check yourself

Split a single file program into a library with two modules, make one internal function `pub(crate)` and one
public, and re-export two types from the crate root. Then call the crate root path from an integration test.
