---
title: Comparisons and ordering
summary: Comparable, Comparator and the sorting that depends on both being right.
chapter: Objects and data
minutes: 12
status: draft
---

## Comparable is the natural order

```java
public record Version(int major, int minor) implements Comparable<Version> {
    @Override
    public int compareTo(Version other) {
        int byMajor = Integer.compare(major, other.major);
        return byMajor != 0 ? byMajor : Integer.compare(minor, other.minor);
    }
}
```

`compareTo` returns a negative number, zero or a positive number. Never compute it by subtracting, because
the difference of two large `int` values overflows and reverses the comparison. Use `Integer.compare`,
`Long.compare` and their friends, which are total and never overflow.

Implementing `Comparable` gives the type a natural order that `List.sort`, `TreeSet`, `TreeMap` and
`Stream.sorted` all use with no extra argument.

## Comparator for every other order

```java
List<Row> rows = new ArrayList<>(catalogue);

rows.sort(Comparator.comparing(Row::key));
rows.sort(Comparator.comparingLong(Row::value).reversed());

rows.sort(Comparator.comparing(Row::key)
        .thenComparingLong(Row::value)
        .thenComparing(Row::id));
```

`Comparator.comparing` takes a key extractor, and `comparingInt`, `comparingLong` and `comparingDouble`
avoid boxing the key. `thenComparing` breaks a tie with the next key, which is what makes a report's order
stable and readable.

The `reversed()` call applies to everything to its left, so a chain with one reversed section needs a
composite key or a second comparator:

```java
rows.sort(Comparator.comparing(Row::key)
        .thenComparing(Comparator.comparingLong(Row::value).reversed()));
```

## Null keys break a comparator

```java
rows.sort(Comparator.comparing(Row::key, Comparator.nullsFirst(Comparator.naturalOrder())));
```

A comparator that calls `compareTo` on a null key throws. `nullsFirst` and `nullsLast` wrap another
comparator and decide where the absent values go, which is a decision worth making explicitly because a
report that puts them at the top and a report that puts them at the bottom are both defensible.

## Sorting in place and sorting a copy

```java
List<Row> sorted = rows.stream()
        .sorted(Comparator.comparing(Row::key))
        .toList();

rows.sort(Comparator.comparing(Row::key));       // mutates the list
```

`List.sort` and `Collections.sort` reorder the list you give them. `Stream.sorted` returns a new list,
leaving the original alone. Both use a stable merge sort, so two rows with equal keys stay in the order
they were already in, which is what makes a two pass sort work:

```java
rows.sort(Comparator.comparingLong(Row::value));
rows.sort(Comparator.comparing(Row::key));       // stable, so value order survives
```

## TreeMap and TreeSet use the comparator, not equals

A sorted container decides whether two keys are the same by comparing them, so a `Version` whose
`compareTo` returns zero for two values that `equals` says are different loses one of them. Keep the two
in step: a natural order that treats equal values as distinct is a bug waiting for the fifth entry in a
`TreeSet`.

## String order is code unit order

```java
List<String> names = new ArrayList<>(List.of("Zoe", "ada", "Bea"));
names.sort(Comparator.naturalOrder());
System.out.println(names);                       // [Bea, Zoe, ada]
```

`String.compareTo` compares UTF-16 units, so every uppercase letter sorts before every lowercase one. That
is rarely what a person expects in a list of names. For a user-facing order, use a
`java.text.Collator`:

```java
Collator collator = Collator.getInstance(Locale.UK);
names.sort(collator);
```

## Check yourself

Sort a list of records by one key and then by two keys with a tie breaker, and print the result after each
sort. Add a row with a null key and confirm the sort throws, then fix it with `nullsLast` and say where the
null ended up.
