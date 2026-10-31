---
title: Dunder methods and operator overloading
summary: The protocol hooks that make len, in, iteration, equality and sorting work on your own types.
chapter: Objects
minutes: 14
status: draft
---

## Protocols are hooks, not inheritance

The interpreter calls a dunder when it sees syntax. Define `__len__` and `len()` works. Define
`__iter__` and a `for` loop works. No base class is involved.

```python
class Deck:
    def __init__(self, cards: list[str]) -> None:
        self.cards = cards

    def __len__(self) -> int:
        return len(self.cards)

    def __getitem__(self, index: int) -> str:
        return self.cards[index]

    def __contains__(self, card: str) -> bool:
        return card in self.cards

    def __repr__(self) -> str:
        return f"Deck({self.cards!r})"


deck = Deck(["A", "K"])
print(len(deck), deck[0], "A" in deck)
print(deck)
```

```text
2 A True
Deck(['A', 'K'])
```

`__getitem__` alone is enough to make an object loopable, because the interpreter falls back to
indexing from zero when `__iter__` is absent.

## repr for developers, str for users

```python
class User:
    def __init__(self, name: str, email: str) -> None:
        self.name = name
        self.email = email

    def __repr__(self) -> str:
        return f"User(name={self.name!r}, email={self.email!r})"

    def __str__(self) -> str:
        return self.name


print(repr(User("ada", "ada@example.com")))
print(str(User("ada", "ada@example.com")))
```

```text
User(name='ada', email='ada@example.com')
ada
```

Write `__repr__` on nearly everything, because it is what you see in a traceback, in the REPL and in a
log line. Showing the field names costs nothing and saves a lookup.

## Equality and hashing belong together

```python
class Tag:
    def __init__(self, name: str) -> None:
        self.name = name

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Tag):
            return NotImplemented
        return self.name == other.name

    def __hash__(self) -> int:
        return hash(self.name)
```

Returning `NotImplemented` lets the other operand have a turn, and Python falls back to identity when
neither side can compare. Defining `__eq__` without `__hash__` makes instances unhashable, which is
correct: equal objects must hash equally or a dict keyed by them loses entries.

## Arithmetic hooks are for values

```python
class Money:
    def __init__(self, cents: int) -> None:
        self.cents = cents

    def __add__(self, other: "Money") -> "Money":
        return Money(self.cents + other.cents)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self.cents == other.cents

    def __repr__(self) -> str:
        return f"Money({self.cents})"


print(Money(150) + Money(250))
print(sorted([Money(300), Money(100)]))
```

```text
Money(400)
Traceback (most recent call last):
TypeError: '<' not supported between instances of 'Money' and 'Money'
```

Addition works and sorting does not, because `__lt__` was never defined. That is the right default:
the type opted into one part of the protocol and not the other. Add `@dataclass(order=True)` or the
comparison methods when an ordering is meaningful.

Overload operators when the type is a value with arithmetic rules. Overloading `+` to mean "merge two
reports" hides work behind a symbol readers assume is cheap.

## Check yourself

Give a class `__len__`, `__getitem__` and `__contains__`, then use it in a loop, a slice, a `len()`
call and an `in` test. Note which worked before you added each method by removing them one at a time.
