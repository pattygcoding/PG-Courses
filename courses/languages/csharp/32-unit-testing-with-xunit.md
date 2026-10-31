---
title: Unit testing with xUnit
summary: Facts, theories, assertions, and the fake that replaces the clock.
chapter: Testing and tooling
minutes: 13
status: draft
---

## A test is a method with an attribute

```csharp
public sealed class PricingTests
{
    [Fact]
    public void Member_discount_takes_five_percent()
    {
        var rule = new MemberDiscount();

        var result = rule.Apply(new Order { Total = 100m });

        Assert.Equal(5m, result);
    }
}
```

`[Fact]` marks a test that always runs and `[Theory]` marks one that runs once per row of data. xUnit creates a
new instance of the test class for each test, so nothing can leak between them through a field.

## Theories for the table of cases

```csharp
[Theory]
[InlineData("1", 1)]
[InlineData("007", 7)]
[InlineData("-3", -3)]
public void Parse_handles_valid_numbers(string raw, int expected)
{
    Assert.Equal(expected, Parse(raw));
}

[Theory]
[InlineData("")]
[InlineData("abc")]
[InlineData("1.2")]
public void Parse_rejects_invalid_input(string raw)
{
    Assert.Throws<FormatException>(() => Parse(raw));
}
```

Each row becomes a named test, so one failure does not hide the rest. The second theory is the habit worth
copying: the inputs that should fail are cases with names rather than an afterthought.

## The assertions worth knowing

```csharp
Assert.Equal(expected, actual);
Assert.True(condition);
Assert.Null(value);
Assert.Contains("needle", haystack);
Assert.Throws<ArgumentOutOfRangeException>(() => Withdraw(-1));
await Assert.ThrowsAsync<TimeoutException>(() => FetchAsync(url));
```

The expected value goes first, because that is the order the failure message prints. Floats compare with a
precision, as `Assert.Equal(1.667, average, precision: 3)`.

## A hand-written fake beats a mock for small things

```csharp
public sealed class FixedClock(DateTimeOffset now) : IClock
{
    public DateTimeOffset UtcNow { get; } = now;
}

[Fact]
public void Invoice_is_dated_from_its_clock()
{
    var clock = new FixedClock(new DateTimeOffset(2026, 3, 7, 9, 30, 0, TimeSpan.Zero));
    var invoice = new Invoice(clock);

    Assert.Equal(new DateOnly(2026, 3, 7), invoice.IssueDate);
}
```

A fake is a few lines, it reads as the thing it replaces, and it will not quietly accept an argument you did
not intend the way a permissive mock will.

## Check yourself

Write one `[Fact]` and one `[Theory]` for a method you already have, run them with `dotnet test`, and then break
the method and read the failure output.
