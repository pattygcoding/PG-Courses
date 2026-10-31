---
title: Password hashing
summary: scrypt, a salt per password, and a comparison that does not leak which byte was wrong.
chapter: API concerns
minutes: 13
status: draft
---

## What must never be stored

```text
the password          a breach is every account, everywhere the person reused it
a hash of it          a breach is a slow guessing game, and the hash decides how slow
```

A password hash is designed to be slow to verify, which is the opposite of every other hash you use. `sha256` is built to be
fast, and a fast hash of a password can be tested billions of times a second on a graphics card. The functions built for
passwords add deliberate work and memory, so each guess costs something. Node ships two of them: `scrypt` and `pbkdf2`. This
project uses scrypt.

## One function, one stored string

```ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("base64url");

  return `scrypt$${salt}$${derived}`;
}
```

```text
scrypt$Qk3n7wJg8gZ1v0mS3xVpTQ$v9A8kR2mQ1sZ6Xw0pJ4tNcLdYbHfUgEoPiWqAsDfGhJk
```

Three parts in one string: which function, the salt for this password, and the derived key. Everything needed to check a
password later is in the value that gets stored.

**The salt is the interesting part.** It is a random value mixed into the password before hashing, so two accounts with the
same password produce different hashes:

```text
hashPassword("same-password")  ->  scrypt$Wq0...$Xk2...
hashPassword("same-password")  ->  scrypt$Lm8...$Bz9...
```

Without a salt, a precomputed table of common passwords turns a breach into a lookup. With one, that table would have to be
rebuilt per account, which is the point. The salt is not secret and does not need to be: it is stored beside the hash.

## Checking, in constant time

```ts
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split("$");

  if (scheme !== "scrypt" || !salt || !expected) {
    return false;
  }

  const derived = scryptSync(password, salt, KEY_LENGTH);

  return timingSafeEqual(derived, Buffer.from(expected, "base64url"));
}
```

Two details matter. `scheme !== "scrypt"` is the guard that makes the format extensible: the day you move to argon2, rows
written by the old code still verify, and a row in a format this code does not know fails closed rather than crashing.

`timingSafeEqual` is the comparison that takes the same time whatever the values. A normal string comparison returns at the
first difference, so a guess sharing the first eight bytes takes measurably longer than one sharing none, and enough
measurements find the hash byte by byte. It also throws when the two buffers differ in length, which is why the stored half is
decoded from base64url first: an error where a `false` belongs is how a login endpoint starts returning 500s.

## What the login endpoint does with it

```ts
router.post("/sign-in", signInLimit, validate({ body: signInBody }), (request, response) => {
  const { email, password } = request.body as z.infer<typeof signInBody>;
  const user = database.prepare("select * from users where email = ?").get(email) as UserRow | undefined;

  // The same answer for an unknown account and a wrong password, so the
  // response cannot be used to find out which emails exist.
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new UnauthorizedError("That email and password do not match an account.");
  }

  const token = signToken({ sub: String(user.id), role: user.role }, secret);

  response.json({ token, role: user.role, expiresIn: 28_800 });
});
```

| Decision | The problem it closes |
| --- | --- |
| one message for both failures | account enumeration, which turns a login form into a list of your users |
| the rate limit on the route | guessing at speed, which no hash defeats on its own |
| the password never logged | a log search that finds passwords |

The first one goes against the reflex to be helpful. "No account with that email" is a better error message and it tells an
attacker which addresses are worth attacking. The test asserts the two responses are identical.

## The cost, and the things not to do

```ts
scryptSync(password, salt, KEY_LENGTH);
```

The default cost in Node sits in the middle of the useful range. Where it is too fast for the threat model, the options take
the numbers: `scryptSync(password, salt, 64, { N: 2 ** 16, r: 8, p: 1 })`, where `N` is the CPU and memory cost and raising it
slows you and an attacker equally. The right number is the largest one that keeps a sign-in under a tenth of a second, which
is a measurement rather than a preference.

Five things to never do:

- encrypt passwords, because encryption is reversible by design;
- hash with `sha256` or `md5`, because both are built to be fast;
- write your own scheme, when three reviewed ones ship in the runtime;
- put a password in a URL, where it lands in logs and history;
- email a password, when a reset link with its own expiry does not put a secret in a mailbox forever.

`bcrypt` and `argon2` are the other two answers and both are fine. Argon2 is the current recommendation where a dependency is
acceptable; scrypt's advantage here is that it is already in Node.

## Check yourself

Hash the same password twice and compare the two strings, then verify the password against both. Time a thousand hashes and
work out what a billion guesses would cost, which is the number to compare against your password policy. Finally raise `N` by
one power, time it again, and say what the cost parameter buys.
