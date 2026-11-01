---
title: Testing with AI
level: Intermediate
summary: Generate tests with a model, then check whether they would actually catch a bug.
labels:
  - AI
  - Testing
  - Quality
minutes: 22
status: planned
---

## What this course is

A model writes a test quickly, and a test that passes proves very little. The question a suite has to
answer is whether it fails when the code is wrong, and a generated test is usually written from the
code it is meant to check, which makes it agree with that code by construction.

This course is about the gap between those two things. Generating cases for a function, then breaking
the function on purpose to see which tests notice. The edge cases a model produces well and the ones
it skips. Property-based tests, which state a rule instead of an example. Mutation testing as a
measurement of the suite rather than of the code. Fixtures, test data, and the flakiness a generated
test brings with it.

## Who it is for

You write tests and you have started generating them, and you want to know what the generated half is
worth. Comfort with one test framework is enough, and the language does not matter.

## What you will build

A test suite for the Northside Library API that survives an audit. Every test is generated with a
model, every one is checked by breaking the code it covers, and the failures that result are written
up as the reason the suite changed.

By the end you have a suite with a measured mutation score, a set of property tests for the loan
rules, and a list of the edge cases the model never proposed.

## Prerequisites

The library API from the Express, FastAPI or Rails course, or any service you can run locally, with a
test framework for the language it is written in.

## How the pages are ordered

The first chapter is what a generated test is worth: where it comes from, why it passes, and the
mutation check that shows whether it would fail. The second is generating tests well, covering the
fixture, the names, and the instruction that asks for the cases rather than the code.

The third is the cases a model misses: empty input, boundaries, concurrency and failure, each with a
way to find it. The fourth is property-based testing, where the rule is the test and the framework
supplies the examples.

The fifth is measurement, covering coverage as a floor rather than a target, and mutation testing as
the honest number. The last chapter is the suite over time: flakiness, runtime, and the tests that
cost more to keep than they return.

Read them in order the first time, following the contents list on this page. Each lesson ends with a
test to break on purpose.
