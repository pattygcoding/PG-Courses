---
title: Conversions and casting
summary: Widening, narrowing, parsing and the checked arithmetic that catches overflow.
chapter: Types and values
minutes: 12
status: draft
---

## Widening conversions happen on their own

```csharp
int count = 3;
long bigger = count;
double exact = count;
```

An `int` fits in a `long` and both fit in a `double`, so the compiler converts without being asked. The
one place this bites is money: `float` and `double` are binary, so `0.1` has no exact representation, and
`decimal` exists for the cases where it has to.

## Narrowing needs a cast, and the cast does not check

```csharp
double value = 300.7;
int narrowed = (int)value;      // 300, truncated, not rounded

long big = 5_000_000_000;
int wrong = (int)big;           // wraps, no error
```

The cast says "I know what I am doing", and the compiler takes your word for it. Numeric overflow wraps
rather than throwing, which is why a value that fits in production for years can suddenly go negative.
`checked` turns the wrap into an exception:

```csharp
try
{
    int wrong = checked((int)big);
}
catch (OverflowException error)
{
    Console.WriteLine(error.Message);
}
```

The project-wide alternative is `<CheckForOverflowUnderflow>true</CheckForOverflowUnderflow>`, which makes
every arithmetic operation checked. It costs a little speed and buys an exception instead of a silent
wrong answer, which is usually the right trade for business code.

## Parsing text

```csharp
if (int.TryParse(raw, out var port))
{
    Console.WriteLine(port);
}
else
{
    Console.WriteLine($"not a number: {raw}");
}
```

`Parse` throws, `TryParse` returns a bool and an out parameter, and there is an overload that takes an
`IFormatProvider` and a `NumberStyles` for anything culture-sensitive. Use `TryParse` on input you did
not create, and pass `CultureInfo.InvariantCulture` for machine-readable values so a machine with a comma
decimal separator does not read `1.5` as fifteen.

## Converting between types with TryConvert-style APIs

```csharp
var text = amount.ToString("F2", CultureInfo.InvariantCulture);
var back = decimal.Parse(text, CultureInfo.InvariantCulture);
```

Round-tripping through an invariant format is the reliable way to persist a number as text. Formatting
without a culture uses the current one, which is how a file written in Berlin reads differently in Boston.

## Check yourself

Cast a `long` larger than `int.MaxValue` to `int` inside and outside a `checked` block and record both
results. Then parse `"1.5"` with the invariant culture and with a comma-decimal culture and compare.
