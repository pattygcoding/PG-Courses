---
title: Tokens with PyJWT
summary: Two endpoints that return the same thing, the claims inside a token, and the warning about a short key.
chapter: Security and API concerns
minutes: 14
status: draft
---

## Two ways to sign in

```python
@router.post("/token", response_model=TokenResponse, summary="The OAuth2 password flow")
def sign_in_form(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    connection: ConnectionDep,
    settings: SettingsDep,
) -> dict[str, Any]:
    """The form the Swagger Authorise button sends, and the one OAuth2 clients expect."""
    user = _authenticate(connection, form.username, form.password)

    return _token_for(user, settings)


@router.post(
    "/sign-in",
    response_model=TokenResponse,
    summary="The same thing as JSON",
    dependencies=[Depends(rate_limit("sign-in"))],
)
def sign_in(payload: SignInRequest, connection: ConnectionDep, settings: SettingsDep) -> dict[str, Any]:
    user = _authenticate(connection, payload.email, payload.password)

    return _token_for(user, settings)
```

`/auth/token` is the OAuth2 password flow, which takes `application/x-www-form-urlencoded` with fields named `username` and
`password`. It is the endpoint the Swagger page's Authorise button uses, and it is why a client generator can talk to the API
without being told anything.

`/auth/sign-in` is the same operation over JSON, which is what a front end wants. Two paths to one function is a deliberate
duplication of the *shape* rather than the logic: `_authenticate` and `_token_for` hold the work, and the two routes hold the
two spellings.

```bash
curl -s -X POST http://127.0.0.1:8000/auth/token \
  -d 'username=librarian@example.com&password=correct-horse-battery'
```

```json
{"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","token_type":"bearer","role":"librarian","expires_in":480}
```

## What is inside

```python
def create_token(subject: str, role: str, secret: str, ttl_minutes: int, now: datetime | None = None) -> str:
    issued = now or datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "iat": issued,
        "exp": issued + timedelta(minutes=ttl_minutes),
    }

    return jwt.encode(payload, secret, algorithm=ALGORITHM)
```

| Claim | Meaning |
| --- | --- |
| `sub` | the account id, as a string because the specification says a string |
| `role` | this application's own claim, which PyJWT passes through |
| `iat` | when it was issued |
| `exp` | when it stops being valid, which PyJWT checks on decode |

**A token is signed, not encrypted.** Everything above is readable by whoever holds the token, which is worth being explicit
about before adding a field:

```text
{"sub":"1","role":"librarian","iat":1793463739,"exp":1793492539}
```

An email address in there is a shareable email address. The signature is what makes `role` trustworthy: a client that edits
the payload to say `librarian` produces a string whose signature no longer matches, and verification rejects it before
anything reads the role.

## Verification

```python
def decode_token(token: str, secret: str) -> dict[str, Any] | None:
    """The claims, or None. Every failure a token can have ends in None."""
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None

    return dict(payload)
```

`algorithms=[ALGORITHM]` is not optional. `jwt.decode` accepts a list of algorithms it may use, and passing the one this
application signs with is what stops the classic attack of sending a token whose header claims `alg: none` or a different
algorithm the server would then honour. The list is the allow list, and PyJWT refuses anything outside it.

One exception class covers expiry, a bad signature and a malformed token, so every failure ends in `None` and the caller has
one branch:

```python
def test_an_expired_token_is_refused(client: TestClient) -> None:
    expired = create_token(
        subject="1",
        role="librarian",
        secret=SECRET,
        ttl_minutes=60,
        now=datetime.now(UTC) - timedelta(hours=2),
    )

    response = client.get("/auth/me", headers={"authorization": f"Bearer {expired}"})

    assert response.status_code == 401
```

`now` is a parameter with a default of the current time, which is what makes that test possible without waiting an hour. The
same trick appears in the borrow function's `today`.

## The warning about the key

```text
InsecureKeyLengthWarning: The HMAC key is 28 bytes long, which is below the minimum recommended length of 32 bytes
for SHA256. See RFC 7518 Section 3.2.
```

PyJWT printed that during the first run of this project, and it was right: the development default in the settings was 28
characters. The repair was to make the short key impossible rather than to remember to set a longer one:

```python
secret_key: str = Field(
    # HS256 keys below 32 bytes make PyJWT warn, and it is right to: a short
    # key is a smaller search space for somebody who has a token to attack.
    default="development-secret-key-change-me-40-chars",
    min_length=32,
)
```

```python
def test_a_short_key_is_rejected_at_startup() -> None:
    with pytest.raises(ValidationError):
        Settings(secret_key="too-short")
```

A warning in a log is easy to ignore for a year. A settings model that refuses to start is not.

## Check yourself

Sign in, copy the token into `jwt.decode` with the signature check disabled, and read the claims. Then change one and send
the result to `/auth/me` to confirm the signature fails, and finally sign a token with a five-second life and wait for it to
expire.
