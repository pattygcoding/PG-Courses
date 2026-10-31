---
title: Creating a project
summary: A virtual environment, four dependencies, and the two tools the Python course set up.
chapter: Getting started
minutes: 13
status: draft
---

## The environment

```bash
mkdir library-api && cd library-api
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS and Linux
python -m pip install --upgrade pip
```

The virtual environment is the Python course's ground rule: packages belong to a project, not to the machine. Everything
below assumes it is active, and every command in this course is written for a terminal where it is.

## The dependencies

```bash
pip install fastapi "uvicorn[standard]" pydantic-settings pyjwt python-multipart
pip install pytest httpx ruff mypy
```

```text
fastapi            0.162.0
uvicorn            0.54.0
pydantic-settings  2.16.2
PyJWT              2.15.1
python-multipart   0.0.33
pytest             9.2.0
httpx              0.28.1
ruff               0.17.3
mypy               2.4.1
```

Five runtime packages and four for development, and each one earns its place:

| Package | Why |
| --- | --- |
| `fastapi` | the framework, which brings Starlette and pydantic with it |
| `uvicorn[standard]` | the server, with the fast HTTP parser |
| `pydantic-settings` | configuration read from the environment, validated |
| `pyjwt` | signing and verifying the access token |
| `python-multipart` | what makes a form upload readable |
| `httpx` | the client `TestClient` is built on |

`python-multipart` is the one that surprises people. A dependency is needed for form data, and without it a form endpoint
fails at import with a message that names the package.

## pyproject.toml

```toml
[project]
name = "library-api"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.162",
    "uvicorn[standard]>=0.54",
    "pydantic-settings>=2.16",
    "pyjwt>=2.15",
    "python-multipart>=0.0.20",
]

[dependency-groups]
dev = ["pytest>=9.2", "httpx>=0.28", "ruff>=0.17", "mypy>=2.4"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
```

`requires-python = ">=3.12"` is a real requirement rather than a preference: the generic models in this course use the class
type parameter syntax, which arrived in that version.

`pythonpath = ["src"]` is what lets a test import the package without installing it. The alternative is an editable install,
which is the right answer for a package that other people use and a step this project does not need.

The `pydantic.mypy` plugin is what makes mypy understand a model's fields as typed attributes rather than as
`Any`. Without it, `book.title` is `Any` and every typo in a field name passes.

## The layout

```text
src/library_api/
  main.py            create_app, the lifespan, the routers
  config.py          Settings, read from the environment
  models.py          request and response models
  errors.py          AppError, and the handlers that render it
  security.py        password hashing and tokens
  dependencies.py    Depends providers shared by routes
  db.py              connection, schema, seed
  repositories/      books.py, loans.py
  routers/           health.py, books.py, loans.py, auth.py, uploads.py
tests/
  conftest.py        fixtures
  test_books.py      reading
  test_writes.py     writing
  test_loans.py      the transaction and the dates
  test_auth.py       accounts, tokens, limits
  test_errors.py     the error contract and health
```

Two decisions in that tree are worth carrying to another project. The package sits under `src/`, so the tests import what
would be installed rather than a sibling folder by accident. And `main.py` exports a *factory*, `create_app()`, with the module
level `app = create_app()` at the bottom for uvicorn: a test builds an application with its own settings, which is the only
reason the suite can run against a temporary database.

## Run it

```bash
python -m uvicorn library_api.main:app --app-dir src --reload
```

```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using WatchFiles
```

`--app-dir src` is what tells uvicorn where the package is, and `--reload` restarts the process when a file changes. The
first request to `/docs` is the fastest way to see whether the wiring worked.

## Check yourself

Create the project, install the dependencies, and add a `main.py` with one route. Run it with and without `--app-dir src` and
read the two errors, then delete `python-multipart` and load a form endpoint to see which package it asks for.
