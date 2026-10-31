---
title: FastAPI
level: Intermediate
summary: Build a typed HTTP API in Python where the type hints your editor already checks are the validation and the documentation.
labels:
  - Framework
  - Backend
  - Python
minutes: 25
status: draft
---

## What this course is

FastAPI is a router, a dependency system and a validation layer, and the three of them are driven by Python type hints. You
write a function whose parameters have types; the framework reads those types, rejects a request that does not match them,
converts what it can, documents the whole surface in an OpenAPI schema, and hands your function values you can use.

The value is in writing the types well. A route that takes `book_id: str` and a model it validates is a route with no
parsing code in it, and the same annotations are what the schema and the tests are written against.

The stack under it is worth knowing before the first page. Starlette handles HTTP, routing and middleware; pydantic does the
validation; uvicorn is the server that speaks to the socket. FastAPI is the layer that ties them together, and every lesson
here names which of the three is doing the work.

## Who it is for

You can write Python, and you want a service that stays correct as it grows, or you have a FastAPI application to maintain
and want to know where a 422 comes from and why one route blocks the event loop.

The Python course in this catalogue covers the language, the virtual environment, `pyproject.toml`, ruff, mypy and pytest.
This one assumes all of that and spends its time on the framework: routing, models, dependencies, errors, security, testing
and shipping.

## What you will build

The Northside Library API, the same library the Ruby, Rails, Next.js and Express courses build, as a JSON service. It is the
same API as the Express course on purpose, so the two read as two answers to one problem.

By the end it has a catalogue you can search and page through, loans that refuse to lend a copy that is already out, a
waitlist, accounts with two roles, JSON Web Tokens, scrypt password hashing, a rate limit on sign-in, CORS, uploads with
limits, problem documents for every error, structured JSON logs with a request id, 68 tests, and a container that answers a
health check and stops cleanly on `SIGTERM`.

The database is SQLite through the standard library. Python ships it, so the course has a real database and no dependency for
it, which keeps the list of packages short enough to read in one screen.

## Prerequisites

Python 3.12 or later, because the models use the type parameter syntax from that version, and a terminal. The course was
written on Python 3.14 with FastAPI 0.162.0, pydantic 2.14.2, uvicorn 0.54.0, pytest 9.2.0, ruff 0.17.3 and mypy 2.4.1.

Comfort with functions, decorators and `async`/`await` is enough. The first chapter starts from an empty directory.

## How the pages are ordered

The first chapter is what the framework is: the three layers it stands on, a project with a virtual environment and the
dependencies, a first endpoint, the idea the rest depends on (the type hints are the API), and the documentation the framework
writes from them.

The second chapter is requests and responses: a pydantic model per shape with the model that hides fields, the status codes
and the model that decides what a client receives, and dependency injection, which is how a connection, an account and a rule
become parameters of a route.

Read them in order the first time, following the contents list on this page. Each lesson ends with something to run, and the
application grows as you go.
