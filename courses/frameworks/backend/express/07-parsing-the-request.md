---
title: Parsing the request
summary: Why req.body is undefined in Express 5, and what a malformed body does to a request.
chapter: Middleware and the app
minutes: 13
status: draft
---

## Nothing parses a body for you

```ts
app.post("/echo", (request, response) => {
  response.json({ body: request.body, type: typeof request.body });
});
```

```bash
curl -s -X POST http://localhost:3000/echo -H 'content-type: application/json' -d '{"title":"Dune"}'
```

```text
{"type":"undefined"}
```

The body arrived and nothing read it. `request.body` is `undefined` until a parser has run, which is a change from Express
4, where it defaulted to an empty object and hid the missing middleware.

A parser is middleware, and it has to be registered before the routes that need it:

```ts
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));
```

```text
{"body":{"title":"Dune"},"type":"object"}
```

## What the two parsers accept

| Middleware | Content type | Gives you |
| --- | --- | --- |
| `express.json()` | `application/json` | `request.body` as a parsed value |
| `express.urlencoded()` | `application/x-www-form-urlencoded` | `request.body` with string values |
| `multer` | `multipart/form-data` | files and text fields |

`urlencoded` with `extended: false` uses Node's built-in parser, which handles the flat key-value pairs a form sends and
does not build nested objects from bracket syntax. The library-based mode is the one to turn on knowingly, because it lets a
client decide the shape of your object.

A multipart upload is not a body you can parse with the first two, which is why the uploads lesson adds multer. Each parser
ignores a request whose content type does not match, so registering all of them is normal.

## The limit is the point

```ts
app.use(express.json({ limit: "64kb" }));
```

```bash
curl -s -o /dev/null -w '%{http_code} %{size_upload}\n' -X POST http://localhost:3000/books \
  -H 'content-type: application/json' --data @scratch/big.json
```

```text
413 70076
```

Without a limit, the size of a request body is the client's decision and your memory is the cost. With it, a request over
the line is refused before the body is read into a string, and the status is the honest one.

The default in Express 5 is 100kb for both parsers, so the 64kb here is a deliberate tightening rather than the thing that
makes the limit exist. Pick a number from what the largest legitimate request is, and keep file uploads on their own parser
with their own limit.

## A malformed body is a 400, not a 500

```bash
curl -s -X POST http://localhost:3000/books -H 'content-type: application/json' --data '{ this is not json'
```

```text
{"type":"https://library.example.com/problems/invalid-json","title":"Bad Request","status":400,
"detail":"The request body is not valid JSON.","code":"invalid_json","instance":"/books"}
```

The parser throws, and the throw is handed to the error handler like any other. What makes the difference between a 400 and
a 500 there is the error's `type`, which `body-parser` sets:

| `error.type` | Meaning | Status |
| --- | --- | --- |
| `entity.parse.failed` | the body is not valid JSON | 400 |
| `entity.too.large` | the body is over the limit | 413 |
| `encoding.unsupported` | an encoding the parser cannot read | 415 |
| `charset.unsupported` | a charset it cannot read | 415 |

```ts
if (candidate?.type === "entity.parse.failed") {
  return new BadRequestError("The request body is not valid JSON.", "invalid_json");
}
```

Mapping those four codes in one place is why the error handler is worth writing carefully. Without it, a client that sends a
broken body gets a 500, the logs fill with an error that is the client's fault, and an alert fires at three in the morning.

## What reaches a handler

```ts
router.post("/", librarian, validate({ body: bookBody }), (request, response) => {
  const book = books.create(request.body);
});
```

By the time that handler runs, three things have happened in order: the parser turned bytes into an object, the validation
middleware checked the object against a schema, and the handler writes it. The order is the chain, and the handler can
assume a validated body because the chain says so.

Nothing in the handler reads `request.body` defensively, and that is not optimism. A field the handler uses is a field the
schema requires, and a type error at that line means the schema and the handler disagree, which is a bug worth hearing
about at compile time.

## Check yourself

Turn the JSON limit down to 1kb, post a body slightly over it, and read the 413. Then remove `express.json()` and post a valid
body with a content type that has no parser registered, and explain the difference between a body that was not parsed and a
body that could not be.
