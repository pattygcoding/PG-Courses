---
title: .NET
level: Intermediate
summary: Host, configure and ship a web service on .NET, from the request pipeline to a container image that runs anywhere.
labels:
  - Framework
  - Backend
  - ASP.NET
minutes: 18
status: draft
---

## What this course is

.NET is the platform a C# program runs on: the runtime, the host, the service container, the
configuration system and the libraries a server is built from. This course covers the server side,
which means ASP.NET Core for HTTP and the decisions around it about how a service starts, reads its
settings, logs what it does and reaches its data.

The language has its own course. This one assumes you can write C# and stays on the platform:
middleware, routing, dependency injection, configuration per environment, persistence, testing and
packaging.

## Who it is for

You can write C# and want to ship a service with it, or you have a .NET service to maintain and want to
understand how its pieces fit before you change them.

## What you will build

An HTTP API with typed endpoints, a request pipeline you can explain from the first middleware to the
response, configuration that differs per environment, a data layer behind an interface, and a test
suite that calls the endpoints the way a client would. The last chapter puts the finished service in an
image that behaves the same on your machine as in production.

## Prerequisites

The .NET SDK, a terminal, and working C#. The last chapter uses Docker. Familiarity with HTTP helps, and
nothing in the course assumes you have written a server before.

## How the pages are ordered

The pages start with the project layout and the host, then work through routing and the request
pipeline, the service container and configuration, persistence, logging and tests, and finish with
packaging and containers. Each page leaves you with a service you can start.
