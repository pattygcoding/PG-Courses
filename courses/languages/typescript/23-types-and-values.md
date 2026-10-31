---
title: Types and values
summary: Two namespaces that share a syntax, the import that disappears, and the flags that keep the two apart.
chapter: Classes and values
minutes: 13
status: draft
---

## A name can be a type, a value or both

```ts
class Row { }                      // both: a type and a constructor
interface Sink { }                 // a type only
const limit = 10;                   // a value only
type Level = 'quiet';                // a type only
```

A class appears in both spaces, which is why `Row` can be used as a type annotation and as a value with `new Row()`. An
interface and a type alias exist only in the type space, so they are gone after compilation and cannot be used as a value
at all.

```ts
const sink: Sink = { write: (line) => console.log(line) };
console.log(Sink);
```

```text
error TS2693: 'Sink' only refers to a type, but is being used as a value here.
```

That error is the type space and the value space being kept apart, and it is the answer to "why can I not check
`instanceof` my interface". There is nothing at run time to check against.

## typeof is the bridge from value to type

```ts
const config = { mode: 'strict', limit: 10 };

type Config = typeof config;
```

`typeof` in a type position takes the type of a value, which is how a value defined with `as const` becomes a type and
how a function's type is captured without writing it out. It is the same keyword as the run time `typeof` operator and
sits in a different space, which is the one place the two are easy to confuse.

```ts
type Parser = typeof parse;
```

## import type disappears at compile time

```ts
import type { Row } from './row.js';
import { parseRow } from './row.js';

const row: Row = parseRow(text);
```

`import type` is erased entirely, so nothing is loaded at run time and the import cannot be used as a value. That matters
when a module is large and only its types are wanted, and it matters for bundlers, because a type-only import is not a
dependency edge.

```ts
import { type Row, parseRow } from './row.js';
```

The inline form mixes both in one statement, which is the shape I use when a module exports a type and a function I both
need.

## verbatimModuleSyntax makes the intent explicit

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

With that flag on, the compiler writes the import statements exactly as they appear, without guessing which are types
and dropping them. That is what a bundler or a single-file transpiler needs, because it cannot know which names are
types, and it makes the type-only import a requirement rather than a nicety:

```ts
import { Row } from './row.js';
```

```text
error TS1484: 'Row' is a type and must be imported using a type-only import when
'verbatimModuleSyntax' is enabled.
```

The message names the fix. The benefit is that the emitted JavaScript has exactly the imports the source has, so a
module with a side effect is not silently dropped.

## isolatedModules and re-exporting a type

```ts
export { Row } from './row.js';
```

```text
error TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using
'export type'.
```

A single-file transpiler cannot tell whether `Row` is a type or a value, so it cannot decide whether the export should
exist at run time. `export type { Row } from './row.js'` says it, and the flag makes the explicit form mandatory. That
flag is effectively required by every bundler and by Node's strip mode, so it is worth turning on in the project rather
than discovering through a build error.

## Where the two spaces meet at run time

```ts
interface Row {
  key: string;
}

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && 'key' in value;
}
```

A type predicate is how a check at run time informs the type space, and it is the only bridge in that direction. There is
no way to enumerate the members of an interface, no way to validate against one, and no reflection. A value that arrives
from outside is checked by hand, by a schema library, or not at all, and the type system is told about the result.

```ts
class Row { }
console.log(typeof Row);
```

```text
function
```

A class does survive, because it is a value, so `typeof Row` is `'function'` at run time and `Row` the type is the
instance shape. Keeping those two facts apart is most of what the two spaces are about.

## Check yourself

Write a class, an interface and a type alias, then try to use each as a value and record the errors. Convert one import
to `import type`, turn on `verbatimModuleSyntax`, and read the error for an import that is missing the keyword. Finally
write `typeof` on a value and use the result as a type.
