---
title: Performance
summary: A YJIT that is not in this build, allocations counted rather than assumed, and the measurement that matters.
chapter: Shipping
minutes: 13
status: draft
---

## Does this build have YJIT?

```bash
ruby -v
```

```text
ruby 3.4.7 (2025-10-08 revision 7a5688e2a2) +PRISM [x64-mingw-ucrt]
```

The absence of `+YJIT` in that string is the answer. YJIT is the compiler that turns hot methods into machine code, and
on Linux and macOS builds of Ruby 3.4 it is built in and off by default; asking for it is a flag:

```bash
ruby --yjit -e "puts 'ran with --yjit'"
```

```text
ruby.exe: warning: Ruby was built without YJIT support. You may need to install rustc to build Ruby with YJIT.
ran with --yjit
```

The program ran, the warning explained why there was no speedup to be had, and it named its own fix. On a build with
YJIT the same command runs with the compiler on, and `RubyVM::YJIT.enabled?` answers `true` from inside the program.
The honest position on Windows: measure the interpreter you have rather than the one in a blog post.

## Counting allocations rather than assuming

```ruby
before = GC.stat(:total_allocated_objects)
list = Array.new(100_000) { |i| "book-#{i}" }
after = GC.stat(:total_allocated_objects)
```

```text
allocations for 100k interpolated strings: 199994
allocations appending into one string:     199993
```

Two runs, two nearly identical numbers, and an assumption gone. Appending into a single buffer looks like it should
allocate once and it does not: the *interpolated* string is allocated before anything is appended, so the count is the
same. The measurement is the point of this section, and the lesson is that the version of this experiment I expected
to write was wrong.

Two allocations per iteration is the honest cost of `"book-#{i}"`, whatever is done with the result. When it matters,
the fix is a different shape, not a different method:

```ruby
list << "book-" << i.to_s
```

That is `<<`, not letters: two appends into the same buffer with one conversion to a string. It is uglier, and it is
the kind of change to make after a profiler has said that this loop is the problem.

## The clock you measure with

```ruby
Benchmark.measure("four cpu") { 4.times.map { Thread.new { countdown } }.each(&:join) }
```

```text
  0.156000   0.000000   0.156000 (  0.165904)
```

User time, system time, total, real time. The first two are CPU seconds the process used; the number in brackets is
wall clock. A gap between the third and the fourth means the process was waiting, and a difference between user time
and real time across threads is the only way to see whether concurrency bought anything.

`Process.clock_gettime(Process::CLOCK_MONOTONIC)` is the raw version of the fourth number, and it is the one to use
for a duration inside a program: it never jumps backwards when the system clock is corrected.

## Where Ruby is slow, and where it is not

| Work | Cost | What helps |
| --- | --- | --- |
| object allocation | high per call, and GC follows | fewer objects, frozen literals, `<<` on a buffer |
| string interpolation | one allocation per `#{}` | `<<`, `format` into an existing buffer |
| a method call | cheap, and megamorphic dispatch is not | fewer layers in a hot loop |
| `Array#each` on a block | cheap | nothing worth doing |
| regex on a long string | can be very slow | anchor it, or parse instead |
| I/O, network, disk | overwhelmingly dominant | batching, buffering, concurrency |
| integer arithmetic | cheap | nothing, once YJIT is on |

The order matters. In a program that reads files or makes requests, time spent making the pure-Ruby part faster is
time wasted, and the profiles page of most projects would say so if anyone ran a profiler.

## Measuring before changing

```bash
ruby -rbenchmark -e "..."
```

`Benchmark.bm` and `Benchmark.bmbm` print a table of the same work done several ways, and `bmbm` runs the whole
sequence twice so the first run's warm-up does not distort the numbers. For a quick check of one loop, `measure` is
enough; for a comparison, `bmbm` is the one whose numbers can be trusted.

A profiler tells you where the time went rather than how long it took. Two options:

```bash
gem install stackprof
ruby -rstackprof -e "StackProf.run(mode: :wall, out: 'tmp.dump') { main }"
```

The habit that makes all of this useful: reproduce the slow case with a benchmark in the repository before changing
anything, so the change can be shown to help rather than assumed to.

## The performance work worth doing first

1. Do not do it until something is slow. The command line tool in this project reads four books and prints a page, and
   every version of it is fast enough.
2. When something is slow, find the boundary. Reading a file, a network call or a database query is where the time is
   in almost every program that has a performance complaint.
3. Then the algorithm. A lookup where there was a scan, a set where there was an array, an index where there was a
   filter.
4. Then the loop. Frozen literals, fewer allocations, `<<` instead of `+` in a string builder.
5. Then the compiler, if the build has one.

Steps 4 and 5 are where the interesting blog posts live and where the smallest gains are.

## Check yourself

Measure how long it takes to build the report from a catalogue of ten thousand books, using
`Benchmark.realtime` around the same call the CLI makes. Then find the slowest line by wrapping the three candidates
in their own timings, and decide whether the fix belongs in the algorithm or in the code.
