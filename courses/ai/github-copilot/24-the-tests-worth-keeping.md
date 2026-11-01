---
title: The tests worth keeping
summary: A suite that costs less to run and read than it returns in confidence.
chapter: Tests
minutes: 12
status: draft
---

## Every test has a running cost

A test costs time on every run and attention on every read, and both grow with the suite. A test that
can never fail is paying that cost and returning nothing, and a generated suite is a good place to
find them.

Three kinds are worth deleting rather than repairing.

## Tests of the framework

A test that asserts a list is empty after construction, or that a stub was called with the arguments it
was called with, is testing the language or the mocking library. Those pass against every version of
your code, which means they cannot tell you anything.

## Tests that restate the code

The second kind asserts the implementation rather than the behaviour. A test of a private helper's
output, where callers use the public function, breaks when the helper is renamed and stays green when
the behaviour changes.

The question to ask of any test is which change in the product would make it fail. If the honest answer
is a rename, the test is coupled to the wrong thing.

## Tests that duplicate each other

The third kind is one case written twice under different names. This shows up in a generated suite
because each test is written in isolation, so two instructions about the same branch produce two
tests. Run the mutation check from the middle of this chapter. When two tests always fail together, and
always for the same reason, one of them is spare.

## What to keep

Keep the test a reader can use to learn a rule. A test named for the situation, asserting the outcome
the rule requires, is documentation that fails when the documentation becomes false. That is what the
first two tests in the suite are for, and it is why the name matters as much as the assertion.

That leaves a workable target. A suite where every test would fail for a different change to the
product, and each one can be read without opening the code.

## Check yourself

Take a suite in your repository and, for each test, write the single change to the product that would
fail it. Any test with no answer is a candidate for deletion. Delete one, run the suite, and note
whether anything got worse.
