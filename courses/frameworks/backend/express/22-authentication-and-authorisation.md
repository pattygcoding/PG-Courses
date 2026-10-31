---
title: Authentication and authorisation
summary: Telling a request who it is, deciding what it may do, and the difference between 401 and 403.
chapter: API concerns
minutes: 13
status: draft
---

## Two jobs, three middleware

```ts
export function authenticate(secret: string) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const header = request.get("authorization");

    if (header?.startsWith("Bearer ")) {
      const payload = verifyToken(header.slice("Bearer ".length), secret);

      if (payload) {
        request.user = { id: payload.sub, role: payload.role };
      }
    }

    next();
  };
}
```

**Authentication** answers "who is this, if anyone". That middleware never refuses a request: a missing header, a malformed
token and an expired token all leave `request.user` undefined and call `next()`. The catalogue is public, so a request without
a token is a valid request.

```ts
export function requireUser() {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      next(new UnauthorizedError("Sign in to continue."));

      return;
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      next(new UnauthorizedError("Sign in to continue."));

      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new ForbiddenError(`This needs one of these roles: ${roles.join(", ")}.`));

      return;
    }

    next();
  };
}
```

**Authorisation** answers "may this request do that", and it refuses. Keeping the two apart is what makes a public route and a
protected one the same code with a different chain:

```ts
router.get("/", validate({ query: listQuery }), handler);                        // anyone
router.get("/:id", readHandler);                                                  // anyone
router.post("/", librarian, validate({ body: bookBody }), createHandler);         // a librarian
router.get("/me", requireUser(), meHandler);                                      // signed in
```

## 401 against 403

```text
401 Unauthorized     no valid identity was presented, and presenting one would help
403 Forbidden        an identity was presented, and it is not allowed
```

The names are misleading and the statuses are not. A request with no token asking to borrow a book is a 401, because signing
in fixes it. A member asking to add a book is a 403, because signing in again changes nothing.

```bash
curl -s -X POST http://localhost:3000/books -H 'content-type: application/json' --data @scratch/book.json
```

```text
{"type":"https://library.example.com/problems/unauthorized","title":"Unauthorized","status":401,
"detail":"Sign in to continue.","code":"unauthorized","instance":"/books"}
```

```text
{"type":"https://library.example.com/problems/forbidden","title":"Forbidden","status":403,
"detail":"This needs one of these roles: librarian.","code":"forbidden","instance":"/books"}
```

Both responses name the rule. The 403 names the roles that would work, which is information a member is allowed to have and a
client can show in a message.

## Where the check goes

```ts
router.post("/", requireRole("librarian"), validate({ body: bookBody }), (request, response) => {
  const book = books.create(request.body);
});
```

The order in that line is deliberate. The role check runs before the validation, so a member who sends a malformed body is
refused by the rule that matters rather than being helped with their JSON.

The rule that does the work is the one that is easy to skip: **every route with a side effect has a check on it.** A
middleware that protects a list of paths is the design where a new route is unprotected because somebody forgot to add a line
to a list, and the failure is silent. On the route, the check is impossible to miss while reading the file.

## Ownership, not only roles

```ts
if (loan.member !== request.user.name && request.user.role !== "librarian") {
  throw new ForbiddenError("That loan belongs to somebody else.");
}
```

A role answers what a kind of account may do. A resource that belongs to a person needs the second check, and it is the one
that gets forgotten, because the role check above it looks like it covers the case.

The shape that holds up: the query that loads the row filters by the owner where the row is personal, and the check on the
result is a 404 rather than a 403. A request for somebody else's loan then cannot tell the difference between "not yours" and
"does not exist", which is one less piece of information to leak.

## Tokens that lie about the role

```ts
request.user = { id: payload.sub, role: payload.role };
```

The role comes from the token, which is signed, so it cannot be edited by a client. What it *can* be is stale: a token signed
while somebody was a librarian keeps saying so for eight hours after the role changed.

| Where the role comes from | Cost | Staleness |
| --- | --- | --- |
| the token | no query | up to the token's lifetime |
| the database, per request | one query | none |

Either is defensible, and the version to avoid is the one that does not know which it is doing. This application takes the
role from the token and keeps the lifetime short, which is the choice to make when a permission change is not an emergency.

## Check yourself

Add an endpoint that only the owner of a loan may see, and try it as the member who borrowed the book, as another member, and
as a librarian. Write down which status each gets and why. Then remove the role check from one write route and confirm that an
anonymous request can perform it, which is the experiment worth running once.
