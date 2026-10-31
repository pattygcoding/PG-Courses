---
title: Testing that pays off
summary: Where to spend the test budget, how to keep a suite fast, and what a flaky test is telling you.
chapter: Testing
minutes: 12
status: draft
---

## Test the boundary, not the internals

A test that calls a function and checks the result survives a rewrite of the inside. A test that asserts
which private methods were called fails the moment the internals change, and then it has to be rewritten
alongside them. Aim at the outside of a module: its public functions, the command it exposes, the
response it returns.

## Three levels with different jobs

| Level       | Scope                                   | Good at                            |
| ----------- | --------------------------------------- | ---------------------------------- |
| Unit        | one function or class                   | every branch, fast, exact failures |
| Integration | several parts, a real file or database  | wiring, serialisation, queries     |
| End to end  | the whole program through its interface | the path a user actually takes     |

Most of the suite belongs at the unit level, because those tests run in milliseconds and name the broken
line. Integration tests catch the mistakes that only appear when parts meet, such as a query that
silently returns strings. End to end tests cover the flows that must not break, and they are the slowest
and the most brittle, which is why there should be few of them.

## Fast is a feature

A suite that takes ten minutes stops being run. Two habits keep it quick: keep tests off the network by
using a local file or a fake, and build expensive shared resources once per session rather than per test.
A test that sleeps to wait for something should wait on a condition instead, and it will also stop being
flaky.

## A flaky test is a bug report

A test that fails one run in twenty is reporting something real: a shared resource, a race, a dependency
on the clock, or an assumption about ordering. Deleting it or adding a retry hides the message. The usual
causes, in the order worth checking:

1. Shared mutable state between tests, including a fixture with too wide a scope.
2. A dependency on the current time, the time zone or the locale.
3. An assumption about dict or set ordering.
4. A real race in the code the test is pointing at.

The last one is the reason to take flakiness seriously instead of treating it as test noise.

## What not to test

- Generated code and vendored libraries.
- The language itself, such as whether a dict lookup works.
- Private helpers already covered through the public function that uses them.
- A test that restates the implementation line by line, which passes when both are wrong.

## Check yourself

Time your suite and list the three slowest tests. Then take a flaky test if you have one and decide which
of the four causes it was before you change it.
