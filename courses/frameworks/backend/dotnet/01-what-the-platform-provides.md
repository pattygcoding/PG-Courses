---
title: What the platform provides
summary: The runtime, the base class library, the host and the SDK, and which one to blame when something goes wrong.
chapter: The platform
minutes: 12
status: draft
---

## Four pieces with four responsibilities

| Piece              | What it is                                             | Where you meet it                   |
| ------------------ | ------------------------------------------------------ | ----------------------------------- |
| Runtime            | loads assemblies, compiles IL, collects garbage        | a slow first call, a pause, a crash |
| Base class library | the `System.*` types and APIs                          | every `using` you write             |
| Host               | starts the app, reads configuration, owns the lifetime | `Program.cs`                        |
| SDK                | compilers, templates, the CLI                          | the terminal                        |

Knowing which piece owns a problem saves guessing. A missing type is a library question, a slow start is a
compile question, and a setting that did not apply is a host question.

## The host, for a service

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok("ready"));
app.Run();
```

Twelve lines that start an HTTP server. The builder collects services and settings, `Build` produces the
application, and `Run` starts it and blocks until the process is asked to stop. Every later lesson adds to one
of those three steps.

## What the host does that a console app does not

A console program starts at `Main` and ends when `Main` returns. A hosted service has a lifetime that outlives
the entry point: the host reads configuration and environment variables before anything else runs, builds the
service container, starts each registered hosted service, waits for a shutdown signal, and then disposes
everything in reverse order. That is why a background loop belongs in a hosted service rather than in `Main`.

## The packaging split worth knowing

```bash
dotnet --info
dotnet tool list --global
```

The first prints the SDK versions and the installed runtimes, which is the fastest answer to "why does this
build here and not there". The second lists global tools, which is where a missing `dotnet-ef` or `dotnet-format`
comes from.

## Check yourself

Print `dotnet --info` and name the runtime and SDK versions you have. Then read `Program.cs` in a service you
have and identify which line registers a service, which builds the app and which starts it.
