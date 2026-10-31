---
title: Validation with zod
summary: One schema per request shape, the errors it produces, and the request property that cannot be written.
chapter: Data
minutes: 14
status: draft
---

## Rules need a home

```ts
router.post("/", librarian, (request, response) => {
  const { id, title, copies } = request.body;

  if (typeof title !== "string" || title.length === 0) {
    throw new ValidationError("A title is required.");
  }

  if (!Number.isInteger(copies) || copies < 0) {
    throw new ValidationError("Copies must be a whole number.");
  }
  // ...
});
```

Six rules across four fields, and the handler stops being about the catalogue. It also answers with the first problem it
finds, so a client fixes one field per request, and nothing anywhere lists what the endpoint accepts.

A schema answers all three: it declares the shape, checks the whole body at once, and can be read by a person.

```ts
const bookBody = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,60}$/, "lower-case letters, digits and hyphens only"),
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(120),
  genre: z.enum([...GENRES]),
  copies: z.number().int().min(0).max(999),
  year: z.number().int().min(0).max(2100),
});
```

## The middleware that applies it

```ts
export function validate(sources: Sources) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const problems: { path: string; message: string }[] = [];

    for (const source of ["params", "query", "body"] as const) {
      const schema = sources[source];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(request[source]);

      if (!result.success) {
        for (const issue of result.error.issues) {
          problems.push({ path: [source, ...issue.path].join("."), message: issue.message });
        }

        continue;
      }

      request[source] = result.data as never;
    }

    if (problems.length > 0) {
      next(new ValidationError("The request is not valid.", problems));

      return;
    }

    next();
  };
}
```

```ts
router.post("/", librarian, validate({ body: bookBody }), (request, response) => {
  const book = books.create(request.body);
});
```

```text
{"type":"https://library.example.com/problems/validation-failed","title":"Bad Request","status":400,
"detail":"The request is not valid.","code":"validation_failed",
"errors":[{"path":"body.id","message":"lower-case letters, digits and hyphens only"},
{"path":"body.title","message":"Too small: expected string to have >=1 characters"},
{"path":"body.copies","message":"Too small: expected number to be >=0"}],"instance":"/books"}
```

Every problem at once, with the path of the field as the client sees it. Three fields, three messages, one round trip.

`safeParse` rather than `parse` is the choice that makes this work: `parse` throws on the first failure, and the collection
above needs the full list. `safeParse` returns a result object, and the branch on `result.success` is where TypeScript learns
whether `result.data` exists.

## The query string cannot be replaced

```text
Cannot set property query of #<IncomingMessage> which has only a getter
```

Express 5 defines `request.query` with a getter and no setter, so a parsed query string cannot be written back onto the
request the way a body can. `request.params` and `request.body` are ordinary properties and accept the assignment.

The middleware handles that by putting the parsed query somewhere else:

```ts
if (source === "query") {
  request.valid ??= {};
  request.valid.query = result.data;
} else {
  request[source] = result.data as never;
}
```

A handler reads it back with the type it expects:

```ts
router.get("/", validate({ query: listQuery }), (request, response) => {
  const query = request.valid.query as z.infer<typeof listQuery>;
```

The cast is the seam, and it is one line per handler rather than a property access in every field. The declaration that makes
`request.valid` exist is a module augmentation, the same mechanism that puts `request.user` on the object.

## Coercion, and where it is honest

```ts
page: z.coerce.number().int().min(1).default(1),
```

A query string is text, so `?page=2` arrives as `"2"`. `z.coerce.number()` converts it, and `?page=abc` becomes `NaN` and
fails with a 400. A JSON body is already typed, so a number field there does not coerce and `"3"` is refused rather than
converted. A query string has no types, so coercion is recovery, and JSON has them, so a string where a number belongs is a
client to fix.

## Where validation belongs

| Layer | Checks | Why there |
| --- | --- | --- |
| the schema | shape, presence, ranges, formats | the request boundary, once |
| the database | uniqueness, references, invariants | the last line, for every writer |
| the handler | rules that need other rows | only the data layer knows them |

A rule that needs another table does not fit a schema, such as "no more loans than copies". That check lives in the
repository, inside a transaction, which is the previous lesson. A schema is for everything a single request can be judged on
by itself.

## Check yourself

Add a `publishedOn` field with an ISO date check, send a date in a different format and read the message. Then make the
handler use a field the schema does not have and see whether TypeScript catches it, and finally add the same schema to a
`patch` route with `.partial()` and confirm that sending one field is accepted.
