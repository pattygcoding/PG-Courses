---
title: FastAPI
level: Intermediate
summary: Build a typed HTTP API in Python where validation and documentation come from the type hints you already wrote.
labels:
  - Framework
  - Backend
  - Python
minutes: 20
status: draft
---

## What this course is

FastAPI is a Python web framework built on type hints. You describe the shape of a request with
Python types, and the framework validates the input, serialises the output, and publishes an OpenAPI
schema from that description. The type hints do the work, so the value is in writing them well.

## Who it is for

You know Python and want to build an API that stays correct as it grows, or you have a service to
maintain and want to understand how its types drive behaviour.

## What you will build

An API with typed routes, request and response models, dependency injection for shared work, and
tests that call the endpoints the way a client would.

## Prerequisites

Python 3 and comfort with the command line. Type hint syntax is introduced as it is used.

## How the pages are ordered

The pages begin with a single typed endpoint, then cover models, validation, dependencies and error
handling, and finish with tests. Each page adds one piece to the same service.
