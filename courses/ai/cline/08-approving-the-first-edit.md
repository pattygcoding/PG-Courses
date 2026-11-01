---
title: Approving the first edit
summary: The first change confirms or contradicts the plan, so read it before the second arrives.
chapter: The working loop
minutes: 11
status: draft
---

## Why the first one matters

The first edit shows what the plan looks like as code. When the file, the naming and the failure shape
match what you expected, the rest of the task tends to follow. When they do not, the remaining edits
repeat the same mistake, and catching it here costs one revert instead of five.

Approving quickly and reading the diff at the end is the habit this lesson exists to replace.

## What to look at

Four things in the first edit, in under a minute.

- The file. Is this where the project puts this kind of code?
- The shape. Does it use the existing result type, or has it introduced a second way of reporting
  failure?
- The boundary. Does it touch anything the plan did not name?
- The style. Naming, error messages and comment density, against the file it sits in.

## A worked example

An agent asked to add a renewal function to a module produced a real diff in a scratch repository:

```text
diff --git a/loans.ts b/loans.ts
index c9bde75..d5a4bf9 100644
--- a/loans.ts
+++ b/loans.ts
@@ -51,3 +51,21 @@ export function borrow(
     catalogue: { ...catalogue, loans: [...catalogue.loans, { bookId, member, due }] },
   }
 }
+
+export function renew(
+  catalogue: Catalogue,
+  bookId: number,
+  member: string,
+  due: string,
+): BorrowResult {
+  const loan = catalogue.loans.find(
+    (candidate) => candidate.bookId === bookId && candidate.member === member,
+  )
+  if (loan === undefined) {
+    return { ok: false, reason: 'no-copy' }
+  }
```

The shape and the naming are right, and the diff is 18 added lines in one file. The line to stop on is
the reason it returns when the loan is not there, which it reports as no-copy. That is the subject of a
later lesson, and it is visible here in the first edit, which is the point of reading it now.

## When to ask instead of reverting

A first edit that is right about the shape and wrong about a detail is worth a question rather than a
revert. "Why does a missing loan report no-copy?" costs one step and produces either a correction or a
reason. A revert costs a restart.

## Check yourself

Approve a first edit, then stop the task and revert it. Read the edit again for the four things above,
and write down which one you would have missed the first time.
