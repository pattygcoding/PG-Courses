---
title: Reading the diff
summary: Four passes over a change, in the order that finds the most.
chapter: Verification
minutes: 12
status: draft
---

## The diff is the change

An agent's summary describes what it believes it did. The diff is what it did. Everything in this chapter
starts from reading the diff, and a change nobody has read has not been reviewed.

Four passes, each asking one question. Reading four times is faster than reading once for all of them.

- What changed. The file list first, before the contents.
- Does it run. Tests and types, which usually decides the review.
- Does it belong. Naming, structure, and whether the code is where this project puts it.
- What is missing. The branch not handled, the check not added, the test not written.

## Start with the file list

```bash
git diff --stat
```

```text
 loans.ts | 18 ++++++++++++++++++
 1 file changed, 18 insertions(+)
```

Two facts in two lines. One file changed, and the change adds 18 lines while removing none. A task meant
to touch one file that shows three is where the review actually starts, and the file list tells you that
before you read any code.

## Then the change itself

```bash
git diff
```

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
+  const loans = catalogue.loans.map((candidate) =>
+    candidate === loan ? { ...candidate, due } : candidate,
+  )
+  return { ok: true, catalogue: { ...catalogue, loans } }
+}
```

That is the whole change, eighteen lines long. Reading it takes less time than reading a paragraph about
it.

## Read for the branches

The pass that finds the most is the last one, and the way to do it is to read for the paths that are not
the happy one. Count the `return` statements. Count the `catch` blocks. Check that each is reachable and
that something tests it.

In the diff above there is one early return, on the line that checks whether the loan exists, and its
reason is `no-copy`. Nothing in the project covers that case, which the next two lessons show by running
it.

## Check yourself

Take a change an agent made and read it four times, once per pass, writing the answer to each. Then count
the branches in the diff and say which one no test reaches.
