---
title: Configuration in tests
summary: Overriding settings, pinning the environment, and the bug that only appears in the pipeline.
chapter: Testing the service
minutes: 11
status: draft
---

## Override one setting at a time

```csharp
using var factory = new WebApplicationFactory<Program>()
    .WithWebHostBuilder(builder =>
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Features:Checkout:RequireVerifiedEmail", "false");
    });
```

`UseSetting` adds a configuration value for that factory only, and it beats the `appsettings.json` in the project
because it is added later. That single behaviour covers most of what a test needs to change.

## Pin the environment

```csharp
builder.UseEnvironment("Testing");
```

Without that line a test reads whatever `ASPNETCORE_ENVIRONMENT` the machine happens to have. A test passes on a
laptop set to Development and takes a different branch on a build agent, which is a failure nobody can reproduce
and everybody blames the test for.

## Validation fails the test at startup

An options class registered with `ValidateOnStart` validates while the factory builds, so a missing required
setting fails the test with the property name instead of surfacing as a null exception several layers away. That
is the second payoff from the configuration lesson, and it is the reason validation belongs there rather than in
each consumer.

## Do not point tests at anything real

```csharp
builder.UseSetting("Auth:Authority", "https://example.invalid");
```

A test aimed at a real identity provider is slow, flaky, and occasionally writes to something that matters.
`.invalid` is reserved and never resolves, so a code path that tries to reach it fails loudly rather than working
only on a machine with network access.

## The setting your test forgot

A test that passes locally and fails in the pipeline is usually reading a setting from a user secrets file that
the agent does not have. Setting every required value explicitly in the test setup removes the class of failure
entirely.

## Check yourself

Run one integration test with the environment unset and then set to `Testing`, and note which configuration file
each run read. Then add a required setting to an options class and confirm the test fails at startup with the
property name.
