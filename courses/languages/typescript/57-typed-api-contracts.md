---
title: Typed API contracts
summary: Sharing a shape between a server and a client, and what that promise is worth.
chapter: Working with the ecosystem
minutes: 13
status: draft
---

## A package of contracts

```text
packages/
  contracts/       types only, no runtime code
  server/          imports the contracts
  client/          imports the contracts
```

```ts
// packages/contracts/src/row.ts
export type Row = {
  key: string;
  value: number;
};

export type RowResponse =
  | { status: 200; rows: Row[] }
  | { status: 400; message: string };
```

A package whose `src` contains types and nothing else is the cheapest way to keep a client and a server agreeing. The
client imports the response type, the server's handler returns it, and a change to either is a compile error in the other.
With `verbatimModuleSyntax` and `import type`, the import costs nothing at run time, so the client does not ship the
contracts package at all.

The property this buys is that the handler and the consumer are checked against one declaration. The property it does not
buy is that the server sends what the type says, which is the boundary lesson again and the reason a schema is still
worth having.

## The handler is checked against the contract

```ts
import type { RowResponse } from '@example/contracts';

export function getRows(): RowResponse {
  return { status: 200, rows: [] };
}
```

A handler that returns a shape the contract does not allow is a compile error, and so is a status with the wrong payload.
That is the same discriminated union from the modelling lesson applied to a wire format, and it is where the union pays for
itself twice: the server cannot send a 400 with rows, and the client has to handle the 400 branch.

## The client validates what it receives

```ts
import { z } from 'zod';
import type { RowResponse } from '@example/contracts';

const RowResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal(200), rows: z.array(RowSchema) }),
  z.object({ status: z.literal(400), message: z.string() }),
]);

const response = RowResponseSchema.parse(await fetchRows());
```

The schema and the type say the same thing twice, and that is deliberate: the type is the promise and the schema is the
check that the promise was kept. `z.discriminatedUnion` is the schema equivalent of the discriminated union, and it
reports which member failed to parse.

Where the two drift, the schema is the one that is enforced and the type is the one the compiler reads, which is a
disagreement worth avoiding. Two ways to avoid it:

```ts
type RowResponse = z.infer<typeof RowResponseSchema>;
```

Deriving the type from the schema makes the schema the source and removes the drift entirely, at the cost of the contracts
package depending on the schema library. Where the contracts package should have no dependencies at all, the
duplicate is the price, and a test that parses a value built from the type keeps the two close.

## Generating the types from the server

```bash
npx openapi-typescript ./openapi.json -o src/api-types.ts
```

Where the server already describes itself, generating the client's types from that description is the version with no
hand-written duplicate: the server's schema is the source, the generated file is a build artefact, and a change to the
server appears as a change in the generated file on the next build. The same applies to a GraphQL schema, a protobuf
definition and a JSON Schema.

The honest costs:

- A generated file is not edited by hand, so a type you want is a change to the specification.
- The generated types are as good as the specification, and a specification that says `object` produces `object`.
- The build has a step that has to run before the type check, which is an ordering the pipeline has to get right.

A hand-written contracts package is better where the API is small and the specification is not maintained, and generated
types are better where the specification exists and is accurate. Both are better than a duplicate written twice by hand.

## The version problem

```ts
export type RowResponse = { status: 200; rows: Row[] };
```

A client built against that type and a server that adds a field are fine, because the extra field is ignored. A server that
removes a field, renames one or changes a type breaks the client, and the client's build catches it only if the client
rebuilds against the new contracts.

That is the deployment problem a shared type cannot solve: the client on a user's machine is running old code against a
new server. The three answers are a versioned endpoint, a field added rather than changed, and a client that validates and
degrades rather than assuming. The type system describes the intent; the wire has to be tolerant.

## Converting at the boundary

```ts
type RowDto = { row_key: string; row_value: number };

function fromDto(dto: RowDto): Row {
  return { key: dto.row_key, value: dto.row_value };
}
```

A wire format and a domain shape are usually different, and the conversion belongs in one function per direction at the
edge of the module rather than spread through the code. A `RowDto` with snake case keys and a `Row` with camel case is
normal, and the conversion is the place where a missing field becomes a default or an error rather than an `undefined`.

## Check yourself

Write a contracts package with a response union, a handler that returns it and a client that switches on the status. Then
add a status to the union and list the files the compiler reports.
