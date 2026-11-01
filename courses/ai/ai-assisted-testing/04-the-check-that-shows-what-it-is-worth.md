---
title: The check that shows what it is worth
summary: Change the unit under test, run the suite, and see whether it notices.
chapter: What a generated test is worth
minutes: 13
status: draft
---

## The technique

A suite is evidence if it fails when the program breaks. There is one way to establish that. Make a small
change to the program, run the suite, record whether anything failed, and change it back.

Each change is a mutant. A suite that fails on a mutant killed it, and a suite that stays green let it
survive.

## The runner

The mutation runner for this course holds ten changes, each a single edit to `loans.ts`, and applies them one
at a time:

```ts
for (const mutant of MUTANTS) {
  writeFileSync(source, original.replace(mutant.from, mutant.to))
  try {
    const run = spawnSync(process.execPath, ['--experimental-strip-types', '--test', ...suites])
    killed = run.status !== 0
  } finally {
    writeFileSync(source, original)
  }
}
```

Three details matter. The original is held in memory and restored in a `finally`, so an interrupted run
cannot leave a mutated file behind. Each mutant is one edit rather than a rewrite, so a kill is attributable
to that edit. And the suite list is a parameter, so the same mutants replay against a different suite.

## The changes

The ten are chosen at the decision points: the count, the arithmetic, the undefined check, the two
comparisons against zero, the three reason strings, the renew guard, the filter inside the map, and the
overdue comparison.

They are the choices a maintainer gets wrong when editing this file, which is what makes a mutant worth
running.

## Reading the result

```text
score 1/10 = 10%
```

Nine of ten changes went unnoticed. That is the number the chapter opened with, and improving it is the rest
of the course.

## Check yourself

Write three mutants for one function in your project: one comparison, one constant and one string. Apply each
in turn, run your suite, and record which were killed. Keep the three as a script you can rerun.
