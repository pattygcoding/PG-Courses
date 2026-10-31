---
title: Middleware
summary: The chain that runs before and after a handler, and the order an Express application actually has.
chapter: Middleware and the app
minutes: 15
status: draft
---

## A chain of functions

```ts
app.use((request, response, next) => {
  const started = Date.now();

  response.on("finish", () => {
    console.log(`${request.method} ${request.path} ${response.statusCode} in ${Date.now() - started}ms`);
  });

  next();
});
```

A middleware is a function that takes the request, the response and `next`. It runs before the route handler, does something,
and calls `next()` to pass control along. Everything in an Express application is that idea, including the route handlers,
which are middleware that end the request instead of calling `next`.

Three things it can do:

| It can | With |
| --- | --- |
| change the request or the response and continue | `next()` |
| answer the request itself and stop | `response.json(...)` |
| hand an error to the error handler | `next(error)` |

Forgetting `next()` is the classic bug. The request hangs with no response and nothing in the log, because the chain has
stopped:

```text
curl: (28) Operation timed out after 10001 milliseconds with 0 bytes received
```

## The order of a real application

```ts
app.disable("x-powered-by");
app.set("trust proxy", config.TRUST_PROXY);

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));
app.use(requestContext(log));
app.use(accessLog(log));
app.use(express.static("public", { maxAge: "1h" }));

app.use(authenticate(config.AUTH_SECRET));

app.use("/health", healthRouter(database));
app.use("/auth", authRouter(/* ... */));
app.use("/books", booksRouter(new BookRepository(database)));
app.use("/loans", loansRouter(new LoanRepository(database)));
app.use("/uploads", uploadsRouter(config.UPLOAD_DIR));

app.use(notFound);
app.use(errorHandler(log));
```

Read it top to bottom and the order is the design:

| Order | Why it is there |
| --- | --- |
| security headers first | even an error response gets them |
| body parsers early | a handler below expects `request.body` |
| request id before the access log | the log line has something to correlate on |
| static files before the routers | an asset request never reaches a route |
| `authenticate` before the routers | every route can read `request.user` if there is one |
| routers | the application itself |
| `notFound` | anything that reached here matched nothing |
| error handler | last, because that is where errors arrive |

Two of those are load-bearing rather than tidy. The body parser ahead of `authenticate` is why a malformed body answers 400
before a missing token answers 401: the parse failure happens first, and the parser hands its error along before any
authorisation has been checked. And `notFound` has to come after the routers, because a middleware that answers 404 runs
before everything below it.

## Mounting at a path

```ts
app.use("/uploads", uploadsRouter(config.UPLOAD_DIR));
app.use(express.static("public", { maxAge: "1h" }));
```

`app.use` with a path means the middleware only runs for requests under it, and the path is stripped before the router sees
it. Without a path it runs for everything, which is why the header and parsing middleware have no first argument.

The order of the last two lines is a small trap: `express.static` with no path runs for every request, so a request for
`/books` passes through it and finds no file before reaching the router. It costs a filesystem lookup per request, and
putting it after the routers avoids that for everything the API serves.

## Error middleware has four arguments

```ts
export function errorHandler(logger: Logger) {
  return (error: unknown, request: Request, response: Response, next: NextFunction) => {
    // ...
  };
}
```

Express decides what a middleware is by the number of parameters it declares. Four arguments means an error handler, and it
is only called with an error, never with `next()`. That is why `next` is in the signature even when it is unused: drop it
and Express registers the function as an ordinary middleware, which never runs for an error.

## A router is middleware

Everything that can be mounted is middleware, and every middleware can be mounted at a path:

```ts
router.use(requireRole("librarian"));
```

That line inside a router makes every route registered after it require the role, which is one place to read rather than ten.
Where a rule applies to some routes and not others, put it on those routes:

```ts
router.post("/", librarian, validate({ body: bookBody }), handler);
```

The second form is what this project uses, because the catalogue is public and only the writes are not.

## Check yourself

Add a middleware that rejects any request whose `x-api-version` header is present but not `1`, then register it in three
places: before the routers, on one router, and on one route. Call each in turn and record which requests it affects. Then
move the access log ahead of the request-id middleware and explain what the log line loses.
