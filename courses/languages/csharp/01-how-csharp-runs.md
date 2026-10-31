---
title: How C# runs your code
summary: Compilation to IL, the runtime that executes it, and what the SDK actually builds.
chapter: Getting started
minutes: 12
status: draft
---

## Two compilations, not one

```bash
dotnet build
```

The C# compiler turns each source file into an assembly. That assembly holds metadata and intermediate
language (IL), not machine code. The runtime compiles the IL to machine code the first time a method is
called, which is why a program's first run and a heavy method's first call feel slower than the rest.

The extra step buys one assembly that runs anywhere the runtime exists, and it is what makes reflection,
debugging and source generators possible at all.

## What the build wrote

```text
bin/Debug/net10.0/
  Shop.dll                 your code, as IL
  Shop.deps.json           the dependency graph
  Shop.runtimeconfig.json  which runtime to start
```

The folder is named for the target framework in your project file, so `net10.0` above matches the SDK
you have. On most platforms the build also emits an app host executable beside the assembly. Running
`dotnet Shop.dll` skips that host and starts the runtime directly, which is what happens inside a
container.

## What the runtime does for you

The common language runtime loads assemblies, verifies the IL, compiles the hot paths, manages memory
with a generational collector, and keeps the type information available at run time. None of that is
your code, and all of it explains behaviour you will meet later: allocation is cheap, collection is not
free, and a short-lived object costs less than one that survives a collection.

## Where the entry point lives

```csharp
Console.WriteLine("hello from the top level");
```

Statements outside any type are a top level program: the compiler generates a `Main` method in a class
named `Program`. For anything beyond a script, declare it yourself so the exit code is visible:

```csharp
internal static class Program
{
    private static int Main(string[] args)
    {
        Console.WriteLine($"args: {args.Length}");
        return 0;
    }
}
```

The return value becomes the process exit code, which is how a shell or a CI step decides whether the
run succeeded.

## Check yourself

Build a console project and list what landed in the output folder. Then run the program twice and compare
the start times, and explain the difference in one sentence.
