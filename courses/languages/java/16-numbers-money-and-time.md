---
title: Numbers, money and time
summary: Why double is wrong for money, how BigDecimal rounds, and the date types that replaced Calendar.
chapter: Objects and data
minutes: 13
status: draft
---

## Binary floating point cannot hold 0.1

```java
System.out.println(0.1 + 0.2);                 // 0.30000000000000004
System.out.println(1.0 - 0.9);                  // 0.09999999999999998
```

A `double` stores a binary fraction, and a decimal fraction such as a tenth has no exact binary form. The
errors are tiny and they compound: a total of ten thousand amounts each slightly wrong is wrong by enough
to fail a reconciliation. Use `double` for a measurement where a relative error is acceptable, and
`BigDecimal` for an amount where the answer must be exact.

## BigDecimal with an explicit scale

```java
BigDecimal price = new BigDecimal("19.99");
BigDecimal quantity = BigDecimal.valueOf(3);

BigDecimal total = price.multiply(quantity);
BigDecimal rounded = total.setScale(2, RoundingMode.HALF_UP);

System.out.println(rounded);              // 59.97
```

`new BigDecimal("19.99")` takes the decimal text exactly, while `new BigDecimal(19.99)` takes the binary
double and its error, and `BigDecimal.valueOf(19.99)` goes through `Double.toString` and is the safe
overload for a double you already have. Always give a scale and a rounding mode: without one, division
throws `ArithmeticException` when the result has no exact representation.

```java
BigDecimal share = price.divide(BigDecimal.valueOf(3), 4, RoundingMode.HALF_EVEN);
```

`HALF_UP` is what most people expect for a cash amount, and `HALF_EVEN` is what accounting standards
sometimes require because it does not drift upward over many roundings. Pick one, write it down, and apply
it at the same point in the calculation every time.

`equals` compares the value and the scale, so `new BigDecimal("1.0").equals(new BigDecimal("1.00"))` is
false while `compareTo` returns zero. Use `compareTo` for a numeric comparison.

## Large integers

```java
BigInteger big = new BigInteger("123456789012345678901234567890");
BigInteger factorial = big.multiply(BigInteger.valueOf(2));
```

`BigInteger` is arbitrary precision and immutable, so every operation returns a new value. It is slower
than `long` by a large factor and worth it only where the value can exceed 64 bits.

## java.time has one type per idea

| Type | What it represents |
| --- | --- |
| `Instant` | a point on the timeline, in UTC |
| `LocalDate` | a date with no time and no zone |
| `LocalTime` | a time of day with no date |
| `LocalDateTime` | a date and a time with no zone |
| `ZonedDateTime` | a date and a time with a zone, with rules applied |
| `Duration` | an amount of time in seconds and nanos |
| `Period` | an amount in years, months and days |

Store and transmit an `Instant`. Convert to a `ZonedDateTime` only to display or interpret it for a person,
because that is where a time zone is actually needed and where a daylight saving transition can make a
local time ambiguous or nonexistent.

```java
Instant now = Instant.now();
Instant later = now.plus(Duration.ofMinutes(30));

ZonedDateTime local = later.atZone(ZoneId.of("Europe/London"));
System.out.println(local.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
```

`Duration` counts exact time and `Period` counts calendar units, so adding one `Period.ofDays(1)` across a
daylight saving change adds one calendar day rather than 24 hours. Use `Duration` for a timeout and
`Period` for "a month later".

## Inject the clock

```java
public Service(Clock clock) {
    this.clock = clock;
}

public Instant now() {
    return clock.instant();
}
```

A method that calls `Instant.now()` directly cannot be tested against a fixed time, and a test that sleeps
to move time forward is slow and flaky. Taking a `Clock` and passing `Clock.systemUTC()` in production
gives `Clock.fixed(...)` in a test at no cost.

## Parse and format explicitly

```java
LocalDate date = LocalDate.parse("2024-03-01");
String text = date.format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.UK));
```

`LocalDate.parse` handles ISO by default, and a custom pattern needs a `Locale` or it uses the default one,
which differs between machines. `DateTimeFormatter` is thread safe, unlike the older `SimpleDateFormat`,
so a formatter can be a `static final` field.

## Check yourself

Add 0.1 and 0.2 as `double` and as `BigDecimal` and print both. Then parse a date, add one `Period` of a
month and one `Duration` of 30 days, and print the two results.
