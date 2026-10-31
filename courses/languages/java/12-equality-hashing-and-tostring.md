---
title: Equality, hashing and toString
summary: The three Object methods every value class must get right, and what breaks when one is wrong.
chapter: The type system
minutes: 13
status: draft
---

## Identity and equality are different questions

```java
String a = new String("ada");
String b = new String("ada");

System.out.println(a == b);        // false, two objects
System.out.println(a.equals(b));   // true, same characters
```

`==` compares two references and asks whether they point at the same object. `equals` asks whether two
objects mean the same thing. Strings are the classic trap: literals are interned and compare equal with
`==`, a `String` built at run time does not, and a program that appears to work with test data fails with
real input.

Use `Objects.equals(a, b)` when either side may be null, since it handles both being null and one being
null without throwing.

## The equals contract

Five properties, and the ones that matter in practice are the first and the last:

| Property | Meaning |
| --- | --- |
| Reflexive | `x.equals(x)` is true |
| Symmetric | `x.equals(y)` implies `y.equals(x)` |
| Transitive | `x.equals(y)` and `y.equals(z)` imply `x.equals(z)` |
| Consistent | repeated calls return the same answer while nothing changes |
| Null-safe | `x.equals(null)` is false, and does not throw |

## equals and hashCode must agree

```java
public final class Row {
    private final String key;
    private final long value;

    @Override
    public boolean equals(Object other) {
        return other instanceof Row row && key.equals(row.key) && value == row.value;
    }

    @Override
    public int hashCode() {
        return Objects.hash(key, value);
    }

    @Override
    public String toString() {
        return "Row[key=" + key + ", value=" + value + "]";
    }
}
```

The rule is that equal objects must have equal hash codes. Break it and a `HashMap` lookup misses even
though the key is present, because the map looks in the bucket the hash points at and the entry went into
a different one. Two objects that are not equal may share a hash code, and that is allowed.

A second rule catches people: the hash code must not depend on a field that changes while the object is a
map key. Adding a mutable field to `hashCode` means an update after insertion loses the entry, since the
map can no longer find it by hashing.

`Objects.hash` is the short form and boxes each argument, so it costs an allocation per call. In a class
used as a map key in a hot path, compute the hash from the fields directly:

```java
@Override
public int hashCode() {
    return 31 * key.hashCode() + Long.hashCode(value);
}
```

## A record does all three

```java
public record Row(String key, long value) { }
```

The generated `equals` compares every component, `hashCode` combines them, and `toString` prints them by
name. That is the reason to reach for a record for a value type: the three methods are the part people get
wrong.

## Ordering should agree with equals

```java
public record Version(int major, int minor) implements Comparable<Version> {
    @Override
    public int compareTo(Version other) {
        int byMajor = Integer.compare(major, other.major);
        return byMajor != 0 ? byMajor : Integer.compare(minor, other.minor);
    }
}
```

`Comparable` documents that `compareTo` returning zero should mean equals returns true. When it does not,
a `TreeSet` treats the two values as duplicates and a `HashMap` keeps both, so the same pair of objects
behaves differently in two containers.

## Check yourself

Write a class with two fields and no `equals` or `hashCode`, put an instance in a `HashSet`, then create an
equal instance and test membership. Add both methods and repeat. Then make one field mutable, insert the
object as a `HashMap` key, change the field, and try to read the value back.
