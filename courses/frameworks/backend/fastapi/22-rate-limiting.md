---
title: Rate limiting
summary: A sliding window as a dependency, the state that has to belong to the application, and the header a client reads.
chapter: Security and API concerns
minutes: 13
status: draft
---

## The window

```python
@dataclass
class Window:
    """A sliding window of the timestamps a key was seen."""

    limit: int
    window_seconds: int = 60
    seen: deque[float] = field(default_factory=deque)

    def check(self, now: float | None = None) -> None:
        moment = now if now is not None else time.monotonic()
        cutoff = moment - self.window_seconds

        while self.seen and self.seen[0] < cutoff:
            self.seen.popleft()

        if len(self.seen) >= self.limit:
            raise RateLimitError()

        self.seen.append(moment)
```

Thirty lines, no dependency, and the structure is the shape every rate limiter has: keep the timestamps of the recent
requests for a key, drop the ones that have aged out, and refuse when the count is at the limit.

`time.monotonic` rather than `time.time` is the clock to use, because it cannot go backwards when the system clock is
adjusted. A wall-clock jump would either extend a window or end every window at once, and neither is a thing to debug on a
Friday.

## A dependency factory

```python
def rate_limit(name: str, limit: int = 10) -> Callable[[Request, SettingsDep], None]:
    """A dependency factory, so a route can carry its own limit.

    The windows live on `app.state`, not in a module level dictionary: two
    applications in one process would otherwise share their counters, and a test
    that builds a second app would start with the first one's history.
    """

    def dependency(request: Request, settings: SettingsDep) -> None:
        # Behind a proxy, the client address is only as good as the proxy
        # configuration. With none set, every request shares one window.
        client = request.client.host if request.client else "unknown"
        allowed = settings.rate_limit_per_minute if name == "sign-in" else limit
        windows: dict[str, Window] = request.app.state.rate_limit_windows
        window = windows.setdefault(f"{name}:{client}", Window(limit=allowed))

        window.limit = allowed
        window.check()

    return dependency
```

```python
@router.post(
    "/sign-in",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit("sign-in"))],
)
def sign_in(payload: SignInRequest, connection: ConnectionDep, settings: SettingsDep): ...
```

That docstring is the record of a bug I wrote and a test caught. The first version kept the windows in a module level
dictionary, which is fine for one application and wrong for two: the suite builds an application per test file, so the second
one started with the first one's history and its first sign-in was refused.

```text
FAILED tests/test_auth.py::test_signing_in_is_rate_limited - assert [429, 429, ...] == [200, 200, 429]
```

The failure is worth reading closely, because it is the shape of every shared-state bug: the assertion expected the *first*
request to succeed and it was already refused. Moving the dictionary to `app.state` gives each application its own counters,
which is also the honest model of what a limiter is: state that belongs to the thing doing the limiting.

## What the settings decide

```python
rate_limit_per_minute: int = Field(default=10, ge=1)
```

```python
allowed = settings.rate_limit_per_minute if name == "sign-in" else limit
```

The limit is configuration, so a test can raise it to a thousand and one test can lower it to two. That is what the fixtures
do, and it is why the suite has a real test of the limit rather than a comment about one:

```python
settings = Settings(..., rate_limit_per_minute=2)
app = create_app(settings)

with TestClient(app) as client:
    codes = [client.post("/auth/sign-in", json=LIBRARIAN).status_code for _ in range(3)]

assert codes == [200, 200, 429]
```

## What a client is told

```python
def test_the_429_carries_retry_after(tmp_path) -> None:
    settings = Settings(..., rate_limit_per_minute=1)
    app = create_app(settings)

    with TestClient(app) as client:
        client.post("/auth/sign-in", json=LIBRARIAN)
        refused = client.post("/auth/sign-in", json=LIBRARIAN)

    assert refused.status_code == 429
    assert refused.headers["retry-after"] == "60"
    assert refused.json()["code"] == "too_many_requests"
    assert refused.headers["content-type"] == "application/problem+json"
```

`Retry-After` is the header a client library reads without being taught, and a hand-rolled limiter has to set it itself:

```python
if isinstance(exc, RateLimitError):
    headers = {"retry-after": str(exc.retry_after)}
```

A `429` without it leaves a client guessing how long to wait, and the guess is usually "immediately".

## Which key

The default here is the client address, which stops one machine from guessing and does not stop a botnet from spreading
attempts across a thousand addresses. It also punishes everyone behind a shared address, such as an office. The stronger
design counts the account as well, with a loose limit on the address and a tight one on the account, which needs the body
parsed and the email taken from it.

Everything above is per process, so two containers have two counters and a client gets twice the allowance. That is the
shared-state problem arriving early, and the answer is the same as the one for the database: a store the instances share,
which is a few lines when the interface is a function.

## Check yourself

Set the limit to three, exhaust it, and read the status, the `Retry-After` and the body. Then compare which key the limiter
sees with and without a proxy in front, and finally build a second application in one process and confirm the two do not share
a window.
