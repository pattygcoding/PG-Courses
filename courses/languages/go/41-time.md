---
title: time
summary: The reference layout, the month that normalises, and the zero value that is a real date.
chapter: The standard library
minutes: 13
status: draft
---

## Formatting uses a reference layout

```go
t := time.Date(2026, 10, 31, 14, 30, 0, 0, time.UTC)

fmt.Println(t)
fmt.Println(t.Format(time.RFC3339), t.Format(time.RFC1123))
fmt.Println(t.Format("2006-01-02 15:04:05"))
```

```text
2026-10-31 14:30:00 +0000 UTC
2026-10-31T14:30:00Z Sat, 31 Oct 2026 14:30:00 UTC
2026-10-31 14:30:00
```

Go formats a time by example rather than by a pattern language: `2006-01-02 15:04:05` is a real date written in the shape you
want, and the number `15` rather than `03` is what makes it 24-hour. The parts to remember:

| Part | Meaning |
| --- | --- |
| `2006` | the year |
| `01`, `Jan`, `January` | the month |
| `02`, `2`, `_2` | the day |
| `15` | the hour, 24-hour |
| `03` | the hour, 12-hour, with `PM` |
| `04` | the minute |
| `05` | the second |
| `.000` | milliseconds, and `.000000` for microseconds |
| `Mon`, `Monday` | the weekday |
| `MST` | the time zone name |
| `-0700`, `Z07:00` | the offset |

The two layouts worth memorising are `time.RFC3339` for anything a machine reads and `2006-01-02` for a date. The gotcha is
that any of those digits appearing in a literal is substituted: putting `2026` in a layout is not the year, it is the literal
text, because `2006` is the token.

```go
fmt.Println(t.Format("Mon 2 Jan 2006"))
```

```text
Sat 31 Oct 2026
```

## Parsing is the same layout

```go
parsed, err := time.Parse(time.RFC3339, "2026-10-31T14:30:00Z")
fmt.Println(parsed.Equal(t), err)
```

```text
true <nil>
```

`time.Parse` in UTC, `time.ParseInLocation` in a named zone. The error when the shape does not match names all three parts:

```text
parsing time "31/10/2026" as "2006-01-02T15:04:05Z07:00": cannot parse "31/10/2026" as "2006"
```

It printed the input, the layout, and the token it failed on, which is enough to fix the call without reading any
documentation. `time.Parse` returns a zero time alongside the error, so the error has to be checked before the value is used.

## Durations

```go
d := 3*time.Hour + 25*time.Minute
fmt.Println(d, d.Seconds(), d.Round(time.Hour), d.Truncate(time.Hour))
```

```text
3h25m0s 12300 3h0m0s 3h0m0s
```

A `time.Duration` is an `int64` of nanoseconds with a `String` method, so it prints as `3h25m0s` and its methods convert:
`Seconds`, `Milliseconds`, `Minutes`, `Hours`, `Round` and `Truncate`. Multiplication by a constant of the duration type is
the idiom for building one: `3 * time.Hour` is 3 hours because `time.Hour` is a `Duration` and the constant takes that type.

`time.Since(start)` is `time.Now().Sub(start)` and `time.Until(t)` is its mirror, and both are the two calls that measure
elapsed time. A duration in a configuration file is `time.ParseDuration("5s")`, which accepts `300ms`, `1.5h` and `2h45m`
and rejects a bare number with the error `time: missing unit in duration "5"`.

## Adding a month normalises

```go
fmt.Println(time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC).AddDate(0, 1, 0))
```

```text
2026-05-01 00:00:00 +0000 UTC
```

The 31st of March plus one month is the 1st of May, because April has thirty days and the addition normalises rather than
clamping to the 30th. That is the behaviour of `AddDate` and it is the one to remember for anything that adds a month or a
year to a date: an end-of-month date drifts forward.

For "the last day of next month" the calculation is a truncation to the first, an `AddDate`, and a subtraction of a day:

```go
first := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
lastDay := first.AddDate(0, 2, 0).AddDate(0, 0, -1)
```

`Add` takes a `Duration` and adds an exact amount of time, so it has none of this behaviour: adding 24 hours to a date
across a daylight-saving boundary is not the same as adding a day, which is why `AddDate` exists.

## Time zones

```go
t2 := t.In(time.FixedZone("CET", 3600))
fmt.Println(t2.Format(time.RFC3339), t2.UTC().Format(time.RFC3339))
```

```text
2026-10-31T15:30:00+01:00 2026-10-31T14:30:00Z
```

`In` converts the same instant to another zone, so both strings are the same moment and the difference is only how it is
written. `time.UTC` and `time.Local` are the two zones to know, `time.LoadLocation("Europe/Berlin")` loads one by name from
the system database, and `time.FixedZone` builds one with a fixed offset and no daylight saving.

The conventions for a service: store and send UTC, convert for display, and never compare a formatted string. `Time.Equal`
compares instants including the monotonic reading, and `Time.Before` and `Time.After` are the comparisons; `==` on two
`Time` values that are the same instant in different zones is false, because the struct fields differ.

## The zero time is a real value

```go
var zero time.Time

fmt.Println(zero, zero.IsZero(), zero.Format(time.RFC3339))
```

```text
0001-01-01 00:00:00 +0000 UTC true 0001-01-01T00:00:00Z
```

A `time.Time` zero value is year 1, which is a valid date by the type's rules and not by any domain's. `IsZero` is the check,
and a struct field with a `*time.Time` is the alternative when absent and year 1 have to be different things.

`json.Marshal` of a time uses `time.RFC3339` by default:

```text
"2026-10-31T14:30:00Z"
```

`UnmarshalJSON` accepts RFC 3339 and returns an error for anything else, which makes a date field in a request body
self-validating as long as the client sends that shape. A field that has to accept a date without a time needs a custom
unmarshaller or a `string` field parsed at the boundary.

## The rules

1. Format with a layout, and never with `String` when a machine will read it.
2. `time.RFC3339` for a timestamp, `2006-01-02` for a date.
3. Check the error from `Parse`, because the value is the zero time when it fails.
4. Store UTC and convert for display.
5. `AddDate` for calendar arithmetic and `Add` for elapsed time.
6. `IsZero` for the zero value, and `*time.Time` when absence is a real state.

## Check yourself

Format one time as RFC 3339, as a date and as a custom layout, then parse each back and compare with `Equal`. Add one month
to the 31st of March and explain the result, then print the same instant in two zones and check that the comparison is equal.
