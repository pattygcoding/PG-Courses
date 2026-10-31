---
title: Continuous integration for a service
summary: Restore, check, build, test and publish, in the order that fails fastest.
chapter: Shipping it
minutes: 13
status: draft
---

## The workflow

```yaml
name: build

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 10.0.x

      - name: Restore
        run: dotnet restore

      - name: Check formatting
        run: dotnet format --verify-no-changes

      - name: Build
        run: dotnet build --no-restore -c Release

      - name: Test
        run: dotnet test --no-build -c Release --logger trx
```

The order is chosen so the cheapest failure comes first. A formatting problem is ten seconds, a compile error is
twenty, and the test suite is minutes. `--no-restore` and `--no-build` reuse what the earlier steps produced
instead of doing the work again.

## Pin the SDK version

```yaml
- uses: actions/setup-dotnet@v4
  with:
    dotnet-version: 10.0.x
```

A pipeline that uses whatever the runner has will change under you on the day the image is updated, and the
failure will look like a code problem. Pin the version and update it deliberately.

## Cache the packages

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.nuget/packages
    key: nuget-${{ hashFiles('**/*.csproj') }}
```

Keyed on the project files, so the cache is reused until a dependency changes. On a run with a cold cache the
restore dominates the build, and this is the step that removes it.

## Publish the image after the tests pass

```yaml
- name: Build image
  if: github.ref == 'refs/heads/main'
  run: docker build -t shop:${{ github.sha }} .
```

Building the image only on main keeps pull requests fast, and tagging with the commit sha makes the artifact
traceable back to the code that produced it. Push to the registry in this step rather than in a separate workflow,
so the image can never be published for a commit that failed its tests.

## Test results as an artifact

A failing test in a pipeline gives you the log. A `.trx` file uploaded as an artifact gives you the list, the
durations and the previous run, which is what turns a one-line failure into something diagnosable.

## Check yourself

Add a workflow with those five steps, push a commit with a deliberate formatting problem and one with a failing
test, and confirm each fails at the step you expected rather than later.
