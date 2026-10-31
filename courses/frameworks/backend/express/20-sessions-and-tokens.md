---
title: Sessions and tokens
summary: Two ways to remember a signed-in client, what each costs, and the token this API signs.
chapter: API concerns
minutes: 14
status: draft
---

## Two shapes

| | A session | A token |
| --- | --- | --- |
| where the state is | the server keeps a record, the client keeps a key | the client keeps everything |
| the credential | an opaque random string | a signed document |
| revocation | delete the record, and it is over | needs a list, or a short life |
| scaling | shared storage between instances | nothing shared |

A session is a row: `sessions(token, user_id, expires_at)`. A token is a claim the server can verify without asking anybody.
The trade is between revocation and statelessness, and neither wins in general.

This API signs tokens, because it has no session table and the promise it needs is the simple one: a token that works until it
expires, and a secret that can be changed to invalidate every token at once.

## What the token contains

```ts
export function signToken(input: { sub: string; role: string }, secret: string, now = Date.now()): string {
  const payload: TokenPayload = {
    sub: input.sub,
    role: input.role,
    exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");

  return `${body}.${signature}`;
}
```

```text
eyJzdWIiOiIxIiwicm9sZSI6ImxpYnJhcmlhbiIsImV4cCI6MTc5MzQ4OTQ0NH0.faQM3v6_gqTmcqLkrrDdN_rLUEJikVV8CNn1nYBbXEI
```

Two parts: the claims, base64url encoded, and an HMAC of those claims. The first half is readable by anybody, which is the
property to be clear about before adding a field:

```text
{"sub":"1","role":"librarian","exp":1793489444}
```

**A token is not encrypted.** It is signed, so it cannot be changed, and everything in it can be read by whoever holds it. An
email address in there is a shareable email address.

The signature is what makes `role` trustworthy. A client that edits the payload to say `librarian` produces a string whose
signature no longer matches, and verification rejects it before anything reads the role.

## Verification, and what makes it fail

```ts
export function verifyToken(token: string, secret: string, now = Date.now()): TokenPayload | undefined {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return undefined;
  }

  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);

  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return undefined;
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;

  if (payload.exp * 1000 < now) {
    return undefined;
  }

  return payload;
}
```

Four reasons a token is refused, and each has a test:

| Reason | Test |
| --- | --- |
| the signature does not match | a token signed with another secret |
| the lifetime has passed | a token signed nine hours ago |
| the shape is wrong | `not-a-token`, which splits into one part |
| the secret rotated | the same as the first, deliberately |

The clock is a parameter with a default of `Date.now()`. That is what makes the expiry test possible without waiting eight
hours, and it is the same trick the data layer uses for its dates.

`timingSafeEqual` rather than `===` matters here too: a comparison that stops at the first difference takes longer the closer
the guess is, which is a signal an attacker can measure.

## Sending it

```bash
curl -s http://localhost:3000/auth/me -H "authorization: Bearer eyJzdWIiOiIxIi..."
```

The `Authorization: Bearer` header has one advantage over a cookie: a browser does not attach it automatically, so a page on
another origin cannot make a request with your credentials unless your code puts the header there.

A browser client still has to choose where to keep it:

| Storage | Sent automatically | Readable by script | Main risk |
| --- | --- | --- | --- |
| memory in the tab | no | yes | gone on reload |
| `localStorage` | no | yes | any script on the page can read it |
| an http-only cookie | yes | no | cross-site requests unless protected |

The version that holds up in a browser is a short-lived token in memory with a longer-lived refresh token in an http-only,
`SameSite` cookie, which is two endpoints and a rotation rule. An API used by other servers does not have the problem at all,
which is why these endpoints are designed around the header.

## Expiry and revocation

```ts
const TOKEN_TTL_SECONDS = 60 * 60 * 8;
```

Eight hours, returned to the client as `expiresIn` so it can refresh before the failure rather than after it. The trade in
that number is the window a stolen token is useful for.

Two things a token cannot do that a session can, and the answer for each: signing out everywhere is an `iat` claim added to the
payload plus a `not_before` timestamp per user to compare it against, and a permission change that has to take effect
immediately means loading the role from the database per request rather than trusting the claim.

## Check yourself

Decode the payload of a token from the running API and read the claims, then change one and send the result back to confirm
the signature fails. Then sign a token with a five-second life, wait for it to expire, and read the 401, and finally raise the
lifetime to a month and write down what that changes about a stolen token.
