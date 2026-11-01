---
title: Running the tests it wrote
summary: The test run that tells you whether the new code is covered at all.
chapter: Verification
minutes: 12
status: draft
---

## Run it before reading it

The check command belongs in the task, so the agent should have run it. Confirm that by running it
yourself. It takes seconds and it separates a change that was verified from one that merely reads well.

```bash
node --experimental-strip-types --test
```

```text
ok 1 - a copy can be borrowed
ok 2 - the last copy cannot be borrowed twice
# tests 2
# pass 2
# fail 0
```

Two tests, both passing, against a change that added a function called `renew`. The suite is green and it
says nothing about the new code, because no test in it exercises the new function.

## Green is not the same as covered

That is the trap this lesson exists for. A passing suite is evidence about the tests that ran. It is not
evidence about the lines no test touched, and an agent that adds a function without a test produces this
output exactly.

The number to look at is not the pass count. It is which of the new branches the run reached.

## The check that makes it visible

The mutation check works here and takes a minute. Break the new code on purpose and run the suite.

```bash
node --experimental-strip-types --test
```

If the suite stays green, nothing covers what you broke. That is the signal to write the test yourself
rather than accept the change, and the signal is the same whether the code was written by a person or a
model.

## Reading the test that came with the change

Where the change does include a test, read it for the reason it exists rather than for its assertions. A
test that calls the new function and asserts it does not throw has verified almost nothing. A test that
builds a situation and asserts the outcome is worth running.

## Check yourself

Run the check command on a change an agent produced. Note the test count before and after the change. If
the count did not move, break the new code and run the suite again to see whether anything notices.
