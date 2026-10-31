---
title: Types at the boundary
summary: Where a value arrives from outside, and the four places TypeScript earns its keep in a server.
chapter: Testing and quality
minutes: 12
status: draft
---

## The compiler caught this one

```ts
router.get("/:id", (request, response) => {
  const book = books.find(request.params.id);
});
```

```text
error TS2345: Argument of type 'string | string[] | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
```

Express 5 types a route parameter as `string | string[] | undefined`, because a pattern can match a segment more than once and
because a handler can be mounted under a path that matched nothing. The compiler refuses to let the value be used as a string
until the code says what it does about the other two cases, which is a real decision:

```ts
export function param(request: Request, name: string): string {
  const value = request.params[name];

  if (typeof value !== "string" || value.length === 0) {
    throw new NotFoundError(`No route parameter named ${name} was matched once.`);
  }

  return value;
}
```

```ts
const book = books.find(param(request, "id"));
```

One helper, one decision, and every handler reads a string. The alternative that the type is there to discourage is
`request.params.id as string`, which moves the failure from a compile error to a runtime one.

## Four places types pay

| Place | What it catches |
| --- | --- |
| the request boundary | a body or a query string of the wrong shape |
| the repository | a column that a query no longer returns |
| the error handler | an error that is not an `AppError` |
| the response body | a shape a client will not accept |

The first is zod, and the inference is what makes it worth having:

```ts
const bookBody = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,60}$/, "lower-case letters, digits and hyphens only"),
  title: z.string().trim().min(1).max(200),
  copies: z.number().int().min(0).max(999),
});

router.post("/", librarian, validate({ body: bookBody }), (request, response) => {
  const book = books.create(request.body);
});
```

`books.create` takes a value inferred from the schema, so adding a required field to the schema is a compile error at the
handler until the handler passes it. The schema is the type, and there is no second declaration to keep in step.

## The casts, and where they live

```ts
request[source] = result.data as never;
```

```ts
const query = request.valid.query as z.infer<typeof listQuery>;
```

Two casts, and both are the seam between a framework's untyped surface and the application's types. The rule that keeps them
from spreading: a cast is allowed where a *check* happened one line above it, and the check is in the same expression or the
line before.

`as never` is the one that looks alarming and is the honest one: the middleware is writing a parsed value onto a property
whose declared type is the framework's, and `never` is how the assignment is allowed without claiming the property changed
type. A `request.body = result.data as never` says "I know this is the raw type; the schema above is what makes it valid".

The casts not to write are the ones that skip a check: `request.body as NewBook`, `JSON.parse(text) as Config`, or
`response.body as User[]`. Each one is an assertion about data that arrived from outside, and none of them is true because it
was written down.

## `any`, and what to do instead

The project has no `any`, and the two places it is tempting are worth naming:

```ts
// a driver row
const row = database.prepare("select * from books where id = ?").get(id) as { copies: number } | undefined;

// a JSON payload from another service
const payload = JSON.parse(raw) as unknown;
const parsed = payloadSchema.safeParse(payload);
```

A row from a database is typed by *asserting the shape the query returns*, which is a claim that the SQL and the type agree.
It is unavoidable with a driver that returns `unknown`, and it is safe while the query is in the same file: a column renamed
in the `select` and not in the type is a bug the next request finds.

A payload from another service is parsed rather than asserted, because the service can change without telling you. `unknown`
plus a schema is the pattern that turns a runtime surprise into a 502 with a message.

## The scripts that keep it honest

```json
{
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "build": "tsc -p tsconfig.build.json"
}
```

Two configurations, because `tsc` does two jobs. `typecheck` checks `src` and `test` and writes nothing, which is the command
for an editor and a CI job. `build` compiles `src` into `dist` and leaves the tests out, which is the command that ships.

The order in CI is the same one this course uses: lint if there is a linter, then `typecheck`, then `test`, then `build`. Each
is slower than the last, and each catches a class of mistake the previous one cannot.

## Check yourself

Delete the `param` helper from one route and read the compiler error, then put it back. Then add a required field to the book
schema and follow the compile errors until the route works, which is the count of places one schema change reaches. Finally
write a cast for a value that arrives from outside and replace it with a schema, and say which of the two you would trust in
production.
