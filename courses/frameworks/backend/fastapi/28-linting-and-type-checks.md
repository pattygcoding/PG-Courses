---
title: Linting and type checks
summary: The 23 things ruff found, the 17 mypy found, and the two settings that make the second one strict.
chapter: Testing and quality
minutes: 13
status: draft
---

## ruff, and what it found first

```bash
python -m ruff check src
```

```text
Found 23 errors.
[*] 1 fixable with `--fix` (1 unsafe fix available with `--fix --unsafe-fixes`).
```

Twenty-three problems in a codebase I had written in one sitting, which is the normal result of turning a linter on late. Two kinds
dominated:

```text
E501 Line too long (119 > 100)
F401 `fastapi.status` imported but unused
UP046 Generic class `Page` uses `Generic` subclass instead of type parameters
```

The third is the interesting one. I had written the page envelope the way the typing documentation shows it:

```python
ItemT = TypeVar("ItemT")


class Page(BaseModel, Generic[ItemT]):
    data: list[ItemT]
    meta: PageMeta
```

The modern spelling uses the class parameter syntax from Python 3.12, and ruff knows because the project declares that
version:

```python
class Page[ItemT](BaseModel):
    data: list[ItemT]
    meta: PageMeta
```

One line instead of two, no `TypeVar` import, and the same behaviour. A `target-version = "py312"` in the ruff configuration
is what makes the rule fire: a linter that does not know which Python you target cannot suggest the newer syntax.

## The line length, and the SQL

```toml
[tool.ruff]
line-length = 100
```

```text
src/library_api/repositories/loans.py:86: E501 Line too long (101 > 100)
```

Some of those were SQL inside a Python string, and the answer was to reformat the query rather than to add a `noqa`:

```python
select books.copies - (
  select count(*) from loans
  where loans.book_id = books.id and loans.returned_on is null
) as available, books.title
```

Then `ruff format` rewrote the Python around it:

```bash
python -m ruff format src tests
```

```text
8 files reformatted, 12 files left unchanged
```

`ruff check` finds problems and `ruff format` fixes layout, and the two are separate commands on purpose: one is about
correctness and the other is about the argument nobody wants to have in a review.

```text
All checks passed!
```

## mypy, in strict mode

```toml
[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
```

```bash
python -m mypy src
```

```text
Found 17 errors in 3 files (checked 20 source files)
```

Three of them were worth their own paragraph:

```text
src/library_api/middleware.py:12: error: Function is missing a type annotation for one or more parameters
src/library_api/routers/books.py:93: error: Argument "responses" has incompatible type
    "dict[int, dict[str, Any]]"; expected "dict[int | str, dict[str, Any]] | None"
```

The first was `call_next` in the middleware, which mypy cannot guess:

```python
async def request_context(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
```

The second was more instructive. Starlette declares `responses` as `dict[int | str, dict[str, Any]] | None`, and my constants
were narrower:

```python
NOT_FOUND: dict[int | str, dict[str, Any]] = {404: {"model": Problem, ...}}
```

Matching the library's declared type is the fix, and the wider key type is not a loss: Starlette accepts a string key so a
status can be documented as `"4XX"`. Declaring my constants the way the framework declares them is the version that does not
need a cast.

The `plugins = ["pydantic.mypy"]` line is what makes a model's fields typed rather than `Any`, so a typo in `book.titel` is
an error instead of a runtime surprise.

```text
Success: no issues found in 20 source files
```

## The three commands

```bash
python -m ruff check src tests
python -m mypy src
python -m pytest
```

In that order, because each is slower than the last and catches a different class of mistake. A lint error is seconds, a type
error is a few seconds, and a failing test is the minute. Running them in the other order is how a five-second feedback loop
becomes a one-minute one.

Two notes on the mypy run worth knowing before it surprises you. It checks `src` and not `tests`, so a new fixture with a
wrong type is not an error unless you add the folder. And it does not check the SQL: a column renamed in a `select` and not in
the dictionary a function claims to return is a mistake only a test finds.

## Check yourself

Turn off the pydantic plugin and count how many of your model field typos mypy stops catching. Then run `ruff check --statistics`
and read which rules dominate, which is the list to thin out with a project-wide decision rather than a `noqa` per line.
