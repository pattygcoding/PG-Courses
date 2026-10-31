---
title: Primitives, wrappers and autoboxing
summary: The eight primitive types, the wrapper classes around them, and the two mistakes they invite.
chapter: The type system
minutes: 13
status: draft
---

## Eight primitives

| Type | Size | Range or values |
| --- | --- | --- |
| `boolean` | 1 byte in practice | `true`, `false` |
| `byte` | 8 bits | -128 to 127 |
| `short` | 16 bits | -32768 to 32767 |
| `int` | 32 bits | about plus or minus 2.1 billion |
| `long` | 64 bits | about plus or minus 9.2 quintillion |
| `char` | 16 bits | one UTF-16 code unit |
| `float` | 32 bits | IEEE 754 single precision |
| `double` | 64 bits | IEEE 754 double precision |

A local variable has no default and the compiler reports an uninitialised one. A field has a default:
zero for numbers, `false` for `boolean`, and `'\u0000'` for `char`. That difference catches people who
expect a field to be validated rather than defaulted.

`int` is the type to write a literal in unless the value can exceed it. A count of anything, an index and
an amount in the smallest currency unit all fit. A timestamp in milliseconds and a file size in bytes do
not, which is where `long` and a trailing `L` are needed.

## Overflow is silent

```java
int max = Integer.MAX_VALUE;
System.out.println(max + 1);      // -2147483648

System.out.println(Math.abs(Integer.MIN_VALUE));   // -2147483648
```

Addition wraps around with no exception, and `Math.abs` on the most negative value returns a negative
number because the positive one does not fit. Use `Math.addExact` where an overflow would be a bug, or
widen to `long` where the value can grow.

## Wrappers exist so primitives can be objects

Each primitive has a wrapper class, which is what a generic collection needs since generics only take
reference types:

```java
List<Integer> counts = new ArrayList<>();
counts.add(1);                 // autoboxing: int becomes Integer
int first = counts.get(0);      // unboxing: Integer becomes int
```

`Integer.valueOf` caches the values from -128 to 127, so two boxed small integers are the same object
and two boxed values outside that range are not. That makes `==` unreliable on wrappers:

```java
Integer a = 127;
Integer b = 127;
System.out.println(a == b);          // true, both come from the cache

Integer c = 1000;
Integer d = 1000;
System.out.println(c == d);          // false, two different objects
System.out.println(c.equals(d));     // true
```

Compare wrappers with `equals`, or unbox them to primitives first. This is the single most common Java
bug in code that uses `Map<Integer, ...>`.

## Unboxing a null throws

```java
Map<String, Integer> counts = new HashMap<>();
counts.put("missing", null);

int count = counts.get("missing");   // NullPointerException
```

The assignment unboxes a null. Write `Integer count = counts.get(...)` when the absence is possible, or
use `getOrDefault` and `Map.merge`. The null check has to happen before the unboxing, not after.

## Conversions

```java
int parsed = Integer.parseInt("42");
long wide = parsed;                  // widening is implicit
byte narrow = (byte) wide;            // narrowing needs a cast, and truncates
double ratio = parsed / 100.0;        // promote before dividing
```

Integer division truncates, so `7 / 2` is 3. Casting a `double` to an `int` rounds toward zero and drops
the fraction. `parseInt` throws `NumberFormatException` on input that is not a number, which is a
`RuntimeException` and so does not appear in a signature: the caller has to know it can fail.

## Check yourself

Print `Integer.MAX_VALUE + 1` and `Math.addExact(Integer.MAX_VALUE, 1)`. Then store 1000 in two
`Integer` variables and compare them with `==` and with `equals`, and explain the two results.
