---
title: Types at the boundary
summary: Where the type system stops, what a schema library adds, and the parsing pattern that makes it honest.
chapter: Modelling
minutes: 13
status: draft
---

## The type system cannot check a network response

```ts
type User = { id: string; name: string };

const response = await fetch('/api/user');
const user = (await response.json()) as User;
```

`response.json()` returns `any`, and the `as` tells the compiler to believe something nothing has checked. If the server
sends `{ id: 1 }` the type says `id` is a string, the program continues, and the failure appears wherever the string was
used.

```ts
const user = (await response.json()) as User;

console.log(user.name.toUpperCase());
```

```text
TypeError: Cannot read properties of undefined (reading 'toUpperCase')
```

That is the runtime gap, and it is the single most important limitation of everything in this course. A type assertion is
a promise the compiler cannot keep, and the only way to keep it is to check the value at run time.

## A validation function is the smallest fix

```ts
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).name === 'string'
  );
}

const body: unknown = await response.json();

if (!isUser(body)) {
  throw new TypeError('not a user');
}
```

Now the type is earned rather than claimed, and the error happens at the boundary with a message that names the problem.
The cost is the `as` inside the predicate, which is unavoidable in a hand-written check, and the length of a check for a
nested shape. Three levels deep and the function is longer than the rest of the module.

## A schema library does the check

```ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()).default([]),
});

type User = z.infer<typeof UserSchema>;

const user = UserSchema.parse(await response.json());
```

`parse` throws on a value that does not match and returns a typed value that does. The type comes from the schema with
`z.infer`, so the shape is defined once and the check cannot drift from it. That is the pattern I would use in any project
that receives data from outside, and this course uses it as the example; a different library with the same shape works the
same way.

```ts
const result = UserSchema.safeParse(input);

if (!result.success) {
  return { kind: 'invalid', issues: result.error.issues };
}
```

`safeParse` returns a result rather than throwing, which is the version to use where a validation failure is an expected
outcome: a form submission, a query parameter, a configuration file. The result type carries the issues, so the error
message for a user can name which field was wrong.

## The schema is the source of the type

```ts
const UserSchema = z.object({ id: z.string(), name: z.string() });

type User = z.infer<typeof UserSchema>;
```

Defining the type by hand and the schema beside it is the mistake this avoids, because the two drift: someone adds a
field to the type and not to the schema, and the parser strips it or the type omits it. Deriving the type from the schema
with `infer` makes that impossible.

The reverse direction, generating a schema from a type, needs a compiler or a code generator, and it is what a
specification-first workflow does: one source, both artefacts. Either direction is fine as long as there is one source.

## Where the boundary is

Every one of these is a place where a type has to be earned rather than declared:

| Source | What to do |
| --- | --- |
| A network response | parse with a schema |
| A JSON or YAML file | parse with a schema |
| An environment variable | parse with a schema and convert |
| A query string | parse with a schema and coerce |
| A database row | parse, or use a client that types the schema |
| `JSON.parse` of anything | parse with a schema |
| A message from a queue | parse with a schema |
| A function argument from JavaScript | validate, or trust the caller if it is your own code |

The last row is the honest exception: a value that arrives from a typed call site within the same program has already been
checked, so validating it again is a cost with no benefit. The boundary is where a value crosses from something the
compiler does not control into something it does.

## The narrow version of the type

```ts
type UserRow = { id: string; name: string };

function toUser(row: UserRow): User {
  return { id: row.id, name: row.name.trim() };
}
```

Inside the program, a value should have the shape it needs rather than the shape the wire format has, and the conversion
happens once at the boundary. That is the parse-don't-validate idea: check the value and produce the type you want,
rather than checking a value and passing the external shape around.

```ts
type ParsedText = Brand<string, 'ParsedText'>;

function parseText(value: string): ParsedText { }
```

Combining a brand with a schema is how a value that has been validated is distinguished from one that has not, which is
the safest version of the boundary and the most ceremony. It is worth it where the same shape arrives from two paths and
only one of them validates.

## Check yourself

Take a `JSON.parse` call in a codebase and add a check for the value, first by hand with a type predicate and then with a
schema library. Compare the two in length and in the error message a wrong value produces.
