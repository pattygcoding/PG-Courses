---
title: .NET
level: Intermediate
summary: Build a web service on .NET, from the project layout to a tested HTTP API and the image it runs in.
labels:
  - Framework
  - Backend
  - C#
minutes: 16
status: draft
---

## What this course is

.NET is the platform under C#: a runtime, a standard library, a build tool and a hosting model. This
course covers the parts you use on a server, which means ASP.NET Core for HTTP, dependency injection
for wiring the pieces together, and the tooling that turns a folder of source into a deployable
service.

The language itself lives in the C# and .NET course. This one starts from a working knowledge of C#
and stays on the platform: configuration, middleware, routing, persistence and hosting.

## Who it is for

You can write C# and want to ship a service with it. Or you have a .NET service to maintain and want
to understand how its pieces fit before you change them.

## What you will build

A small HTTP API with typed endpoints, configuration that differs per environment, a data layer, a
test suite that calls it the way a client would, and a container image that behaves the same on your
machine as it does in production.

## Prerequisites

The .NET SDK, a terminal, and working C#. Docker is needed for the last chapter only.

## How the pages are ordered

The pages start with the project layout and the host, then move through routing, dependency
injection, configuration and persistence, and finish with tests and packaging. Each page leaves you
with a service you can start.
