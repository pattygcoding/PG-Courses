---
title: Custom exceptions
summary: When a new exception type earns its place, how to carry data on it, and the hierarchy to stop at.
chapter: Errors and resources
minutes: 11
status: draft
---

## A custom exception is for a case a caller handles

```csharp
public sealed class PricingException : Exception
{
    public PricingException(string message)
        : base(message) { }

    public PricingException(string message, Exception inner)
        : base(message, inner) { }

    public PricingException(string message, string sku)
        : base(message) => Sku = sku;

    public string? Sku { get; }
}
```

The type exists so that a caller can write a precise `catch (PricingException)`. If no caller does that, a
built-in exception with a clear message is the smaller answer, and it is the one to try first.

## Carry data as a property

```csharp
throw new PricingException("rule did not apply", sku: row.Sku);
```

Anything a caller needs belongs on the exception as a property. Reading a property stays stable, while
parsing your own message breaks the first time the wording changes or the message is translated.

## Two constructors are enough

The older pattern added a protected constructor taking `SerializationInfo` for remoting. Remoting and
`BinaryFormatter` are gone, and the constructor is no longer required or recommended, so the message and
message-plus-inner constructors are the whole convention now.

## A small hierarchy beats one type and a flag

```csharp
public abstract class AppException(string message, Exception? inner = null)
    : Exception(message, inner);

public sealed class PaymentDeclinedException(string reference)
    : AppException($"payment declined: {reference}");

public sealed class InventoryShortfallException(string sku, int missing)
    : AppException($"short by {missing} of {sku}");
```

One abstract base lets a caller catch everything the application raises without catching the runtime's own
errors, and adding a subclass later does not break existing handlers. Add a subclass when a caller needs to
branch on it, and stop when it stops being caught.

## Preserve the cause

```csharp
try
{
    var rate = await _rates.LookupAsync(sku);
    return total * rate;
}
catch (HttpRequestException error)
{
    throw new PricingException($"could not price {sku}", error);
}
```

Passing the original exception as the inner exception keeps the cause in the trace, which is what makes a
translated error readable at two in the morning. Losing it is the most common mistake in exception handling.

## Check yourself

Add a custom exception with a property, throw it from a lower layer with the cause attached, and catch it at
two levels of precision. Confirm both the message and the property survive.
