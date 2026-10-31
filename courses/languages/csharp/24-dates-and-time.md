---
title: Dates, times and durations
summary: DateTimeOffset over DateTime, DateOnly for calendar days, and the arithmetic that crosses an offset change.
chapter: The standard library
minutes: 13
status: draft
---

## Three types, three jobs

```csharp
DateTimeOffset instant = DateTimeOffset.UtcNow;
DateOnly day = DateOnly.FromDateTime(DateTime.Today);
TimeSpan elapsed = TimeSpan.FromMinutes(90);

Console.WriteLine(instant.ToString("O"));
Console.WriteLine(day.ToString("yyyy-MM-dd"));
Console.WriteLine(elapsed.TotalMinutes);
```

Use `DateTimeOffset` for an instant, because it carries the offset and cannot be misread. `DateOnly` and
`TimeOnly`, added in .NET 6, remove the timestamp you never wanted on a birthday. `TimeSpan` is a duration.

## DateTime and the Kind that is easy to ignore

```csharp
var unspecified = new DateTime(2026, 3, 7, 9, 30);  // Kind = Unspecified
var local = DateTime.Now;                           // Kind = Local
var utc = DateTime.UtcNow;                          // Kind = Utc
```

`DateTime` records a `Kind` without enforcing it, and each conversion assumes the value means what its `Kind`
says. A record from a database arrives as `Unspecified` and gets converted as if it were local, which is where
most time zone bugs come from. `DateTimeOffset` has no such gap.

## Store UTC, display local

```csharp
var zone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
var local = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone);

Console.WriteLine(DateTimeOffset.UtcNow.ToString("O"));
Console.WriteLine(local.ToString("O"));
```

```text
2026-03-07T14:30:00.0000000+00:00
2026-03-07T09:30:00.0000000-05:00
```

Converting at the edge, where a person reads or writes the value, keeps every comparison and every stored
value free of the question. `TimeZoneInfo` reads the platform's time zone database, so it follows daylight
saving.

## Parsing and formatting name a culture

```csharp
var text = instant.ToString("O", CultureInfo.InvariantCulture);
var back = DateTimeOffset.Parse(text, CultureInfo.InvariantCulture);
```

The round-trip format `O` sorts as text and keeps full precision. Use the invariant culture for anything
machine-readable, because a machine using day-first dates reads `03/07/2026` differently from one using
month-first.

## Adding a day is not always adding a day

```csharp
var start = new DateTimeOffset(2026, 3, 7, 12, 0, 0, TimeSpan.FromHours(-5));
var tomorrow = start.AddDays(1);
```

That adds exactly 24 hours. If the offset changed in between, the wall clock tomorrow is not noon, and the
type cannot guess which one you meant. When the answer has to be the same clock time, convert to the zone,
take the date, and rebuild the instant from it.

## Check yourself

Store an instant as both `DateTimeOffset` and `DateTime.UtcNow`, read each back with a local conversion, and
say which one lost information. Then add a day across a daylight saving change and compare the wall clock with
what you expected.
