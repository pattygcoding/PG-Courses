---
title: Fixtures, parametrize and fakes
summary: Setup injected by name, one test over many inputs, and replacing a dependency without lying to yourself.
chapter: Testing
minutes: 14
status: draft
---

## A fixture is setup injected by name

```python
import pytest
from shop.store import MemoryStore


@pytest.fixture
def store() -> MemoryStore:
    store = MemoryStore()
    store.add("widget", 10)
    return store


def test_lookup(store: MemoryStore) -> None:
    assert store.price("widget") == 10


def test_missing_key(store: MemoryStore) -> None:
    with pytest.raises(KeyError):
        store.price("missing")
```

The parameter name chooses the fixture, and a fresh one is built for each test that asks for it, so no
test can affect another through shared state. A test that passes alone and fails in the suite is almost
always shared mutable state.

## Scope is a shared-state decision

```python
@pytest.fixture(scope="session")
def corpus():
    ...
```

`scope="module"`, `"class"` and `"session"` build the fixture less often and share it more widely. Use a
wider scope for something expensive and genuinely read only, and leave the default per-test scope for
anything a test might modify.

## parametrize runs one test over many inputs

```python
import pytest


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("1", 1), ("007", 7), ("-3", -3)],
)
def test_parse_int(raw: str, expected: int) -> None:
    assert parse_int(raw) == expected


@pytest.mark.parametrize("raw", ["", "abc", "1.2"])
def test_parse_int_rejects(raw: str) -> None:
    with pytest.raises(ValueError):
        parse_int(raw)
```

Each row becomes its own test with its own name, so one failure does not hide the others. The second test
is the habit worth copying: the inputs that should fail are cases with names, not an afterthought.

## Replacing a dependency

```python
def test_low_stock_alerts(monkeypatch: pytest.MonkeyPatch) -> None:
    sent: list[str] = []

    def fake_send(message: str) -> None:
        sent.append(message)

    monkeypatch.setattr("shop.alerts.send", fake_send)
    alert_if_low(5)

    assert sent == ["stock low"]
```

`monkeypatch.setattr` replaces the attribute for the duration of the test and restores it afterwards.
Patch the name where it is looked up, which is usually the module that imports it rather than the module
that defines it.

Prefer a real or fake implementation to a mock where one is cheap. A small class written for the test
reads better than a chain of mock call assertions, and it does not agree with nonsense arguments the way
a permissive mock will.

## Check yourself

Turn three near identical tests into one parametrized test. Then replace a mock in a test you already
have with a small fake class and see whether the assertions got shorter or longer.
