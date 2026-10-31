---
title: Iterators and for-each
summary: How the enhanced for loop works, what it forbids, and the exception that says you changed a collection mid-iteration.
chapter: Collections and streams
minutes: 12
status: draft
---

## Iterable is what makes for-each work

```java
public interface Iterable<T> {
    Iterator<T> iterator();
}

public interface Iterator<T> {
    boolean hasNext();
    T next();
}
```

```java
for (String name : names) {
    System.out.println(name);
}
```

compiles to

```java
for (Iterator<String> it = names.iterator(); it.hasNext(); ) {
    String name = it.next();
    System.out.println(name);
}
```

A type that implements `Iterable` can be the subject of a `for` loop. That is why a collection, an
`EnumSet`, a custom range and the lines of a file all look the same in a loop.

The loop variable is a copy of the reference, so reassigning it changes nothing outside the loop:

```java
for (Row row : rows) {
    row = new Row("other", 0);        // the list is unchanged
}
```

To change what is in the list, use an index and `set`, or replace the list with a new one built by a
stream.

## Removing during iteration

```java
for (Iterator<String> it = names.iterator(); it.hasNext(); ) {
    if (it.next().isBlank()) {
        it.remove();
    }
}
```

`Iterator.remove` is the only removal that a `for` loop can perform. Calling `names.remove(...)` inside the
loop instead throws `ConcurrentModificationException`, because a fail-fast iterator keeps a modification
count and checks it on every `next`. The exception is there to turn a silent wrong answer into a clear
failure, so seeing it means the code would have produced wrong output on another input.

```java
names.removeIf(String::isBlank);
names.replaceAll(String::strip);
```

`removeIf` says what it does in one line and is implemented with the iterator internally. `replaceAll` is
the matching operation for a transform in place.

## Accept the type you actually need

```java
public void writeAll(Iterable<String> lines) { }
```

A parameter typed as `Iterable` accepts a `List`, a `Set`, a `Deque` and anything else iterable, while a
parameter typed as `List` accepts only the first. Take the widest interface the method uses, which is
usually `Iterable` for a loop and `Collection` when the method needs `size()`.

The interface table worth knowing: `Collection` adds `size`, `add` and `contains` over `Iterable`, `List`
adds an index, `Set` adds uniqueness, `Deque` adds both ends, and `Map` is not a collection at all.

## Iterating a map

```java
sizes.forEach((key, value) -> System.out.println(key + " = " + value));

for (Map.Entry<String, Long> entry : sizes.entrySet()) {
    System.out.println(entry.getKey() + " = " + entry.getValue());
}
```

`forEach` with a `BiConsumer` is shorter and harder to debug, since there is no line to stop on inside the
lambda. A loop over `entrySet` is the version to reach for when you expect to add a condition later.

## Reading a file line by line

```java
try (Stream<String> lines = Files.lines(path, StandardCharsets.UTF_8)) {
    lines.filter(line -> !line.isBlank()).forEach(System.out::println);
}
```

`Files.lines` returns a stream that holds an open file handle, which is why it is used inside a
try-with-resources block. Leaving it unclosed keeps the file open until the GC gets to it, which on Windows
means the file cannot be deleted. The `BufferedReader` version with the same structure is the other way to
do it, and the resources page covers both.

## Check yourself

Write a loop that removes an element with `list.remove` and read the exception. Rewrite it with an iterator
and then with `removeIf`, and confirm both work. Then change a method parameter from `List<String>` to
`Iterable<String>` and call it with a `Set` to show the wider type accepting more.
