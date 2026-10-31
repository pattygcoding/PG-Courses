---
title: Generics and type erasure
summary: Type parameters, wildcards and the runtime information the compiler throws away.
chapter: The type system
minutes: 14
status: draft
---

## Generic methods and types

```java
public static <T extends Comparable<? super T>> T largest(List<T> values) {
    T best = values.get(0);

    for (T value : values) {
        if (value.compareTo(best) > 0) {
            best = value;
        }
    }

    return best;
}

public final class Stack<T> {
    private final Deque<T> items = new ArrayDeque<>();

    public void push(T item) {
        items.push(item);
    }

    public T pop() {
        return items.pop();
    }
}
```

`T extends Comparable<? super T>` says the type must be comparable to itself or to a supertype of itself.
That bound is what `Collections.sort` uses, and writing it is how a method declares what it needs from its
type parameter.

## Wildcards and PECS

```java
public static double total(List<? extends Number> values) { }    // reads
public static void addAll(List<? super Integer> target) { }       // writes
```

`? extends Number` accepts a `List<Integer>` or a `List<Double>` and lets you read each element as a
`Number`. `? super Integer` accepts a `List<Number>` or a `List<Object>` and lets you add an `Integer`.
The rule is producer extends, consumer super: a parameter you only read from uses `extends`, one you only
write to uses `super`, and one you do both with takes the exact type.

A `List<Object>` is not a `List<String>` and never will be, which is why the wildcard is needed rather
than an assignment. The compiler allows the covariance only where it can prove nothing unsafe happens.

## Erasure removes the parameter at run time

```java
List<String> names = new ArrayList<>();
List<Integer> counts = new ArrayList<>();

System.out.println(names.getClass() == counts.getClass());    // true
```

Both objects are an `ArrayList` at run time. The compiler inserts casts at the points where a value comes
out of a collection, which is what makes the code safe without the runtime knowing the parameter. Three
consequences are worth remembering:

```java
new T();                       // does not compile, T is unknown at run time
new T[];                       // does not compile for the same reason
value instanceof List<String>;   // does not compile, only the raw type is testable
```

The workaround for the first is a `Supplier<T>` or a `Class<T>` parameter. For the second, use a
`List<T>` instead of an array, or an `Object[]` with casts. For the third, downcast and trust, or change
the design so the test is not needed.

## Unchecked warnings are worth fixing

```java
@SafeVarargs
static <T> List<T> listOf(T... items) {
    return List.of(items);
}
```

`@SafeVarargs` tells the compiler the method does not do anything unsafe with the array it receives,
which is a promise you are making rather than a warning to silence. A raw type such as `List` without a
parameter is the other source of unchecked warnings, and it exists for compatibility with code written
before generics.

## Where to put the type parameter

```java
public <T> T read(Class<T> type) { }
```

Passing a `Class<T>` when the method has to construct or check a `T` is the standard workaround for
erasure. It costs the caller one argument and gives the method the runtime information it otherwise
cannot have.

## Check yourself

Write one method taking `List<? extends Number>` and one taking `List<? super Integer>`, call both from a
`List<Integer>` caller, and note which one the compiler refuses in each direction. Then print the
`getClass()` of a `List<String>` and a `List<Integer>` and explain the result.
