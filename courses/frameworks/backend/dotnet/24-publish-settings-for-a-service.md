---
title: Publish settings for a service
summary: ReadyToRun, invariant globalization, trimming, and what each one costs.
chapter: Shipping it
minutes: 12
status: draft
---

## The flags, and the trade each one makes

```bash
dotnet publish -c Release -r linux-x64 --self-contained false \
  -p:PublishReadyToRun=true \
  -p:InvariantGlobalization=true
```

| Flag                     | Buys                          | Costs                                           |
| ------------------------ | ----------------------------- | ----------------------------------------------- |
| `-r <rid>`               | a build for one platform      | portability                                     |
| `--self-contained true`  | no runtime needed on the host | a much larger image                             |
| `PublishReadyToRun`      | faster startup                | a larger image and a per-platform build         |
| `InvariantGlobalization` | smaller image, faster startup | no culture-aware comparison or formatting       |
| `PublishTrimmed`         | the smallest output           | reflection breaks unless every use is annotated |

## ReadyToRun is for a scale-to-zero platform

Precompiling the IL to native code for the target platform shortens the first request after a cold start. A
service that runs continuously gains almost nothing, because the JIT costs you once. A container that starts
hundreds of times a day gains a visible amount, and it is worth measuring rather than assuming.

## Invariant globalization is a behaviour change

Skipping the ICU data means `string.Equals` becomes ordinal and `ToString("C")` stops producing a currency
symbol. It shrinks the image and speeds startup, and it is the wrong setting for a service that formats money or
compares text a person typed. Turning it on by accident is a bug that appears on a machine with a different
locale.

## Trimming and ASP.NET Core

`PublishTrimmed` works for a console tool and is not supported for ASP.NET Core, because the framework uses
reflection in ways the trimmer cannot see. A self-contained web service gets its size from the runtime rather
than from trimming, so a smaller base image is the lever that works.

## Environment settings that change behaviour

```bash
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
ConnectionStrings__Shop=Host=db;Database=shop
```

Production changes how much of an exception reaches a response and turns off the developer exception page, so a
deployment that forgets it behaves differently from the tests that ran against it.

## Check yourself

Publish with and without ReadyToRun and compare the startup time and the output size. Then enable invariant
globalization and find one formatting call in your service whose behaviour changes.
