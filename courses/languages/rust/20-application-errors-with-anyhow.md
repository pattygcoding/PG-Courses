---
title: Application errors with anyhow
summary: One error type for a binary, context on the way up, and where it stops being the right tool.
chapter: Error handling
minutes: 12
status: draft
---

## A binary cares that it failed

```rust
use anyhow::{Context, Result};

fn load(path: &str) -> Result<Config> {
    let text = std::fs::read_to_string(path)
        .with_context(|| format!("reading {path}"))?;

    let config = toml::from_str(&text).context("parsing the config file")?;

    Ok(config)
}
```

`anyhow::Result<T>` is `Result<T, anyhow::Error>`, and `anyhow::Error` holds any error plus a chain of context
messages. The type is erased, which is exactly wrong for a library and exactly right for a program whose last
step is printing a message and exiting.

## Context is the point

```text
Error: reading config.toml

Caused by:
    0: No such file or directory (os error 2)
```

`context` adds a layer, and `with_context` adds one lazily, so the string is only built when the closure runs.
Printing the error prints every layer, which is why a failure that crosses five function calls still says where
it entered your code and what the operating system said.

## Building an error from scratch

```rust
use anyhow::{anyhow, bail};

fn port(value: Option<&str>) -> Result<u16> {
    let Some(value) = value else {
        bail!("no port supplied on the command line");
    };

    value.parse::<u16>().map_err(|error| anyhow!("bad port {value}: {error}"))
}
```

`bail!` returns early with a formatted error. `anyhow!` builds one where a value is needed. Both are for cases
where no caller will match on the variant, which is the assumption the whole type rests on.

## Inspecting an erased error

```rust
match run() {
    Err(error) => {
        if let Some(io) = error.downcast_ref::<std::io::Error>() {
            if io.kind() == std::io::ErrorKind::NotFound {
                eprintln!("nothing to do");
                return Ok(());
            }
        }

        return Err(error);
    }
    Ok(()) => {}
}
```

`downcast_ref` recovers a concrete type from the erased error. It works, and needing it often is a signal that
a specific case deserves its own variant in a typed error type instead.

## Where anyhow stops being right

A library returns typed errors so a caller can distinguish "not found" from "permission denied" without
parsing a message. Use `thiserror` there and `anyhow` in the binary that depends on it. A crate that returns
`anyhow::Error` in its public API has removed the caller's ability to make that decision, and it is a hard
mistake to undo because `anyhow::Error` in a signature is a semver commitment.

## Check yourself

Write a binary with three fallible steps and add `context` to each. Break the second step and read the output.
Then write a library function returning a typed error and call it from the binary, converting at the boundary
with `?`.
