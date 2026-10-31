---
title: Custom error types
summary: An enum per crate, Display and Error implemented by hand, and what thiserror generates.
chapter: Error handling
minutes: 13
status: draft
---

## One error enum for a crate

```rust
use std::fmt;
use std::path::PathBuf;

#[derive(Debug)]
pub enum LoadError {
    Read { path: PathBuf, source: std::io::Error },
    Parse { line: usize, source: std::num::ParseIntError },
}

impl fmt::Display for LoadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Read { path, .. } => write!(f, "cannot read {}", path.display()),
            Self::Parse { line, .. } => write!(f, "bad number on line {line}"),
        }
    }
}

impl std::error::Error for LoadError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Read { source, .. } => Some(source),
            Self::Parse { source, .. } => Some(source),
        }
    }
}
```

`Display` is the message a user sees. `source` is the underlying cause, which is what a log line prints when it
walks the chain. Keeping the path and the line number in the variant means the caller can report where the
failure happened without parsing a string.

## Crate errors are not module errors

A library whose functions can fail in five ways wants one public error type, so a caller matches on one enum
rather than on five. Internals can have their own types and convert up with `From`, which `?` uses.

```rust
impl From<std::io::Error> for LoadError {
    fn from(source: std::io::Error) -> Self {
        Self::Read { path: PathBuf::new(), source }
    }
}
```

That `From` is what makes `?` accept an `io::Error` in a function returning `LoadError`. Write it once and
every call site gets the conversion.

## thiserror writes the boilerplate

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LoadError {
    #[error("cannot read {}", path.display())]
    Read {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("bad number on line {line}")]
    Parse {
        line: usize,
        #[from]
        source: std::num::ParseIntError,
    },
}
```

`#[error("...")]` generates `Display`, `#[source]` and `#[from]` generate the `Error` implementation and the
conversion. That removes about forty lines per error type and gives every type in the crate the same shape.
`anyhow` is the companion for applications rather than libraries, and the next lesson covers it.

## Keep the variants useful

```rust
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum ConfigError {
    #[error("missing key {0}")]
    Missing(String),

    #[error("value for {key} is not a number")]
    NotANumber { key: String },
}
```

A variant with the offending key in it is worth more than a variant named `InvalidInput`. Add `#[non_exhaustive]`
on a public enum so a later variant does not force a semver major version.

## Do not lose the cause

```rust
let text = std::fs::read_to_string(&path)?;
```

rather than

```rust
let text = std::fs::read_to_string(&path).map_err(|_| LoadError::Bad)?;
```

The second form compiles and throws away the operating system's message, which is usually the only part that
says why a file could not be opened.

## Check yourself

Write an error enum with two variants, one carrying a source error, implement `Display` and `Error` by hand,
and print the whole chain with a loop over `source()`. Then convert the same type to `thiserror` and delete the
hand written code.
