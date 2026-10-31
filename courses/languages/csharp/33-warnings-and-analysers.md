---
title: Warnings, analysers and nullable cleanup
summary: Turning the compiler into a reviewer, and the fixes that pay for themselves.
chapter: Testing and tooling
minutes: 11
status: draft
---

## Warnings are free tests

```xml
<PropertyGroup>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <EnableNETAnalyzers>true</EnableNETAnalyzers>
  <AnalysisLevel>latest-Recommended</AnalysisLevel>
</PropertyGroup>
```

The first line turns every warning into a build failure, which is the only way a warning stays fixed. The other
two enable the built-in analysers and choose how strict they are. Start at `latest-Recommended`, clear what it
reports, and relax a specific rule by number rather than switching the set off.

## Nullable is the analyser that pays most

```csharp
var text = Find("missing");
Console.WriteLine(text.Length);
```

With nullable enabled, the second line warns because `Find` returns `string?`. That one warning replaces the
argument about whether the value can be null, and the fix is a line of code rather than a conversation. Turning
it on in an existing project produces a long list, and working through it finds real bugs rather than style
opinions.

## Suppress by number, with a reason

```csharp
#pragma warning disable CA2007 // ConfigureAwait is unnecessary in a console application
await ReadAsync(path);
#pragma warning restore CA2007
```

A suppression with a reason records a decision in the file where it applies. A blanket `<NoWarn>` in the project
file forgets the reason and turns the rule off for code written a year later by somebody who cannot see it.

## Analyser packages

```xml
<ItemGroup>
  <PackageReference Include="AsyncFixer" Version="1.6.0" PrivateAssets="all" />
  <PackageReference Include="Meziantou.Analyzer" Version="2.0.0" PrivateAssets="all" />
</ItemGroup>
```

`PrivateAssets="all"` keeps an analyser out of the package you publish, because it belongs to the build rather
than to the code. Add one at a time and clear its warnings before adding the next, or the list becomes noise
nobody reads.

## Check yourself

Enable warnings as errors in a project you have, build it, and fix the first ten warnings. Note which single
warning class produced the most entries before you started.
