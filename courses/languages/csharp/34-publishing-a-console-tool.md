---
title: Publishing a console tool
summary: A release build, a single file, and a tool that installs onto the command line.
chapter: Testing and tooling
minutes: 12
status: draft
---

## Publish, rather than copying the debug folder

```bash
dotnet publish -c Release -o ./publish
```

`publish` resolves the runtime, gathers the dependencies and produces what the app needs to run. `-c Release`
turns on optimisations, and publishing Debug output is the mistake that makes a tool feel slow for months.

## Naming the target

```bash
dotnet publish -c Release -r linux-x64 --self-contained false -p:PublishSingleFile=true
```

`-r` names the runtime identifier, so the output targets one platform. `--self-contained false` keeps the
dependency on the shared runtime, which is a small download that requires the runtime on the target machine.
`--self-contained true` bundles the runtime and gives a much larger file that runs anywhere matching `-r`.

`PublishSingleFile` packs everything into one executable. It does not make startup faster, and it can confuse a
tool that expects its own directory, so reach for it when a single file is the point of the deliverable.

## An installable tool

```xml
<PropertyGroup>
  <PackAsTool>true</PackAsTool>
  <ToolCommandName>shop</ToolCommandName>
  <PackageId>Shop.Cli</PackageId>
  <Version>1.0.0</Version>
</PropertyGroup>
```

```bash
dotnet pack -c Release
dotnet tool install --global Shop.Cli --add-source ./nupkg
shop --help
```

`PackAsTool` plus a command name is the whole of the setup, and the result installs a command onto the user's
path. That is the right shape for a small utility, and it needs nothing else to ship.

## Versioning worth keeping straight

```xml
<PropertyGroup>
  <Version>1.2.0</Version>
  <AssemblyVersion>1.2.0.0</AssemblyVersion>
  <FileVersion>1.2.0.0</FileVersion>
</PropertyGroup>
```

Keep `Version` aligned with your tags, because it is the number a bug report quotes. `AssemblyVersion` is what
other assemblies bind to, so it can stay behind `Version` while the package moves forward.

## Check yourself

Publish a console tool twice, once framework dependent and once self-contained, and compare the output sizes.
Then pack it as a tool, install it, and run the command by name from a different directory.
