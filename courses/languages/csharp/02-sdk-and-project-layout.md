---
title: The SDK, the CLI and the project file
summary: The commands worth knowing by heart, and the settings in a csproj that change how your code compiles.
chapter: Getting started
minutes: 12
status: draft
---

## Five commands cover most days

```bash
dotnet new console -o Shop
dotnet run
dotnet build -c Release
dotnet test
dotnet add package Serilog
```

`new` scaffolds a project from a template, `run` builds and runs it, `build -c Release` compiles with
optimisations, `test` runs the test projects it can find, and `add package` edits the project file and
restores for you. A solution file, `dotnet new sln` then `dotnet sln add`, is what ties several projects
together.

## What the project file is for

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>
```

Four of those properties are worth understanding. `TargetFramework` decides which parts of the standard
library you can use. `Nullable` turns nullable reference types on, which is the single most useful
compiler setting in the language. `ImplicitUsings` adds the common `using` directives so files stay
short. `TreatWarningsAsErrors` makes the compiler refuse to build code that warns, and I keep it on for
libraries.

## Where the settings come from

A `Directory.Build.props` at the repository root applies to every project below it, which is how a team
keeps the same nullable setting everywhere without repeating it:

```xml
<Project>
  <PropertyGroup>
    <Nullable>enable</Nullable>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>
</Project>
```

## Project layout that survives growth

```text
Shop.sln
src/Shop/Shop.csproj
tests/Shop.Tests/Shop.Tests.csproj
Directory.Build.props
```

Separating `src` and `tests` keeps the production assemblies out of the test project's references by
accident, and it makes the packaging later a matter of pointing at one folder.

## Check yourself

Create a console project with `dotnet new`, turn on nullable reference types and warnings as errors, then
introduce a warning on purpose and confirm the build fails. Remove the setting afterwards.
