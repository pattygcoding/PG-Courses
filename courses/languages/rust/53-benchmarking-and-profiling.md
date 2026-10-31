---
title: Benchmarking and profiling
summary: A measurement you can trust, and the tools that say where the time actually goes.
chapter: Performance and the machine
minutes: 14
status: draft
---

## criterion runs the benchmark properly

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "parse"
harness = false
```

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_parse(c: &mut Criterion) {
    let input = std::fs::read_to_string("tests/data/large.csv").expect("fixture");

    c.bench_function("parse large", |b| {
        b.iter(|| parse(black_box(&input)))
    });
}

criterion_group!(benches, bench_parse);
criterion_main!(benches);
```

```bash
cargo bench
cargo bench -- --save-baseline before
```

`criterion` warms up, runs the closure many times, and reports a confidence interval rather than a single number.
The `harness = false` line is required because it replaces the built in test runner that Cargo normally uses.
`--save-baseline` stores a result so a later run can be compared against it:

```bash
cargo bench -- --baseline before
```

## black_box stops the optimiser from winning

```rust
b.iter(|| parse(black_box(&input)))
```

Without `black_box`, the compiler can hoist the call out of the loop or delete it when the result is unused, and
the benchmark reports a time near zero. Wrapping the input and the output in `black_box` tells the compiler the
value is used in a way it cannot see, so the work actually happens.

## Measure, do not guess

The reason a benchmark suite matters is that intuition about performance is wrong often enough to be useless. The
common surprises are that a change to a hash function dominates everything else, that a `clone` in a cold path
costs nothing, and that an optimisation in a hot path is neutralised by a bounds check two lines away.

A benchmark that runs in the test suite is a benchmark nobody runs. Keep them in `benches/`, run them deliberately,
and store the baselines you compare against.

## Finding the hot spot

```bash
cargo install cargo-flamegraph
cargo flamegraph --bench parse
```

A flame graph shows where the samples landed, with each frame's width proportional to the time spent in it. It
tells you which function to look at, which is the question a benchmark cannot answer by itself. `samply` is the
cross platform alternative and opens the profile in a browser.

On Linux, `perf stat` adds hardware counters:

```bash
perf stat -e cache-misses,branch-misses ./target/release/tool
```

A high cache miss rate points at a layout problem, and a high branch miss rate points at data dependent branches
that a different formulation of the loop could remove.

## The size of the binary

```bash
cargo install cargo-bloat
cargo bloat --release --crates
```

`cargo bloat` lists what takes space in the binary, grouped by crate. It is how you find that one dependency
pulled in a large table, and it is worth running when a release binary is unexpectedly large.

## The release profile is part of the measurement

```toml
[profile.release]
lto = "thin"
codegen-units = 1
panic = "abort"
```

`codegen-units = 1` gives the optimiser the whole crate at once and slows the build. Thin LTO inlines across crate
boundaries, which matters when a generic function from a dependency is in a hot loop. Measure with the profile you
ship, because a benchmark on the default release settings with many codegen units does not tell you what the
release build will do.

## Check yourself

Write two implementations of one function, put both in a criterion benchmark, and run them with and without
`black_box`. Record the difference, then run a flame graph on the slower one and say which function dominated.
