---
title: Password hashing with scrypt
summary: A salt per password, a comparison that does not leak which byte was wrong, and the cost that buys.
chapter: Security and API concerns
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
passwords add deliberate work and memory, so each guess costs hardware and time. Python ships `hashlib.scrypt` and
`hashlib.pbkdf2_hmac`, which is why this project needs no dependency for it.

## One function, one stored string

```python
KEY_LENGTH = 32
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_MAXMEM = 64 * 1024 * 1024


def hash_password(password: str) -> str:
    """A scrypt hash with its parameters and salt, in one storable string."""
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        maxmem=SCRYPT_MAXMEM,
        dklen=KEY_LENGTH,
    )

    return f"scrypt${SCRYPT_N}${salt.hex()}${derived.hex()}"
```

```text
scrypt$16384$9f2c...$4b7a...
```

Four parts in one string: which function, the cost, the salt for this password, and the derived key. Everything needed to
check the password later is in the value that gets stored, including the cost, which is what lets the cost change while old
rows keep verifying.

**The salt is the interesting part.** It is a random value mixed into the password before hashing, so two accounts with the
same password produce different hashes:

```python
def test_two_hashes_of_one_password_differ() -> None:
    assert hash_password("same") != hash_password("same")
```

Without a salt, a precomputed table of common passwords turns a breach into a lookup. With one, that table has to be rebuilt
per account. The salt is not secret: it is stored beside the hash, and its job is to make one hash useless against another
row.

## Checking, in constant time

```python
def verify_password(password: str, stored: str) -> bool:
    """Check a password against a stored hash, in constant time."""
    try:
        scheme, parameters, salt, expected = stored.split("$")
    except ValueError:
        return False

    if scheme != "scrypt":
        return False

    derived = hashlib.scrypt(
        password.encode(),
        salt=bytes.fromhex(salt),
        n=int(parameters),
        r=SCRYPT_R,
        p=SCRYPT_P,
        maxmem=SCRYPT_MAXMEM,
        dklen=KEY_LENGTH,
    )

    return hmac.compare_digest(derived.hex(), expected)
```

Three details, and each is a test in the suite:

`stored.split("$")` in a `try` is the guard that makes the format extensible and the parse total. A row whose format this
code does not know fails closed with `False` rather than raising, and the day the cost changes, rows written by the old code
still verify because the cost travels in the string.

`hmac.compare_digest` rather than `==` is the comparison that takes the same time whatever the values. A normal string
comparison returns at the first difference, so a guess sharing the first eight characters takes measurably longer than one
sharing none, and enough measurements find the hash byte by byte.

`bytes.fromhex(salt)` rather than the string, because `hashlib.scrypt` wants bytes for the salt and a hex string would be a
different salt than the one that was written.

```python
def test_a_stored_value_in_an_unknown_format_fails_closed() -> None:
    assert verify_password("anything", "not-a-hash") is False
    assert verify_password("anything", "md5$abc$def$ghi") is False
```

## What the endpoint does with it

```python
def _authenticate(connection: Any, email: str, password: str) -> dict[str, Any]:
    row = connection.execute(
        "select id, email, password_hash, role from users where email = ?", (email,)
    ).fetchone()

    # The same answer for an unknown account and a wrong password, so the
    # response cannot be used to find out which emails exist.
    if row is None or not verify_password(password, row["password_hash"]):
        raise UnauthorizedError("That email and password do not match an account.")

    return dict(row)
```

| Decision | The problem it closes |
| --- | --- |
| one message for both failures | account enumeration, which turns a login form into a list of your users |
| the rate limit on the route | guessing at speed, which no hash defeats on its own |
| the password never logged | a log search that finds passwords |

The first one goes against the reflex to be helpful, and the test asserts the two responses are identical:

```python
def test_a_wrong_password_and_an_unknown_email_look_identical(client: TestClient) -> None:
    wrong_password = client.post("/auth/sign-in", json={"email": LIBRARIAN["email"], "password": "no"})
    unknown_email = client.post("/auth/sign-in", json={"email": "nobody@example.com", "password": "no"})

    assert wrong_password.json() == unknown_email.json()
```

## The cost, and the things not to do

`SCRYPT_N = 2**14` with `r=8` needs about 16 MB per hash, and memory is the parameter that makes a graphics card's advantage
smaller, because it is the resource an attacker cannot compress away. `maxmem` has to be raised above OpenSSL's default for
the higher settings, which is the kind of thing that fails at run time rather than at import.

The right number is the largest one that keeps a sign-in inside its latency budget, which is a measurement rather than a
preference: hash a password in a loop, time it, and pick a cost that keeps one sign-in under a tenth of a second.

Four things never to do: encrypt passwords, because encryption is reversible by design; hash with `sha256` or `md5`, because
both are built to be fast; put a password in a URL, where it lands in logs and history; and email a password, when a reset
link with its own expiry does not put a secret in a mailbox.

`bcrypt` and `argon2-cffi` are the other two answers and both are fine. Argon2 is the current recommendation where a
dependency is acceptable; scrypt's advantage here is that it is already in the standard library.

## Check yourself

Hash the same password twice and compare the two strings, then verify against both. Time a thousand hashes and work out what
a billion guesses would cost, and compare that number against your password policy.
