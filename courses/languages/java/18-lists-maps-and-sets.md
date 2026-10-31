---
title: Lists, maps and sets
summary: The three container interfaces, their immutable factories, and the views that write through.
chapter: Collections and streams
minutes: 14
status: draft
---

## List keeps a position for every element

```java
List<String> names = new ArrayList<>();
names.add("ada");
names.add(0, "grace");
names.set(1, "ada lovelace");

System.out.println(names);            // [grace, ada lovelace]
System.out.println(names.indexOf("grace"));    // 0
System.out.println(names.subList(0, 1));        // [grace]
```

`subList` returns a view rather than a copy: it reflects later changes to the parent list, and writing to
it writes through. That is why `names.remove(1)` and `names.remove("grace")` are different calls, and why
`names.remove(Integer.valueOf(1))` is needed when the list holds integers and you mean the element rather
than the index.

## Map is keyed lookup

```java
Map<String, Long> sizes = new HashMap<>();

sizes.put("a", 10L);
long size = sizes.getOrDefault("b", 0L);

sizes.putIfAbsent("a", 99L);                             // no change, key exists
sizes.computeIfAbsent("c", key -> key.length() * 10L);

sizes.merge("a", 5L, Long::sum);                          // 15
sizes.merge("d", 1L, Long::sum);                          // 1, key was missing
```

`merge` adds the key when it is absent and combines the values when it is present, which makes it the
shortest correct way to accumulate. `computeIfAbsent` builds a value on first use, which is the idiom for a
map of lists:

```java
Map<String, List<Row>> byKey = new HashMap<>();
for (Row row : rows) {
    byKey.computeIfAbsent(row.key(), key -> new ArrayList<>()).add(row);
}
```

```java
for (Map.Entry<String, List<Row>> entry : byKey.entrySet()) {
    System.out.println(entry.getKey() + ": " + entry.getValue().size());
}
```

`entrySet` is the way to iterate a map with both halves. Iterating `keySet` and calling `get` for each key
turns one hash lookup into two.

## Set holds one of each

```java
Set<String> seen = new HashSet<>();

if (seen.add("ada")) {
    System.out.println("first time");
}
```

`add` returns false when the element was already present, which is a cheap duplicate check without a
separate `contains` call. A set uses `equals` and `hashCode` to decide sameness, so a type without them
gives a set that accepts duplicates.

## Immutable factories and unmodifiable views

```java
List<String> fixed = List.of("a", "b");
Set<String> unique = Set.of("a", "b");
Map<String, Integer> single = Map.of("a", 1);

List<String> view = Collections.unmodifiableList(mutable);
```

`List.of`, `Set.of` and `Map.of` build an immutable collection and reject nulls. `Collections.unmodifiableList`
wraps an existing list and returns a view: the wrapper cannot be modified, the list underneath still can,
and the holder sees every change. An immutable copy is the safer thing to hand out.

`Map.of` takes at most ten pairs. For more, use `Map.ofEntries(Map.entry(...), ...)` or a mutable map that
is copied at the end.

`Arrays.asList` is the trap of the group: it returns a fixed size list backed by the array, so `set`
works, `add` throws, and writes through to the array.

## Views write through

```java
Map<String, Long> sizes = new HashMap<>();
sizes.put("a", 1L);

Set<String> keys = sizes.keySet();
keys.remove("a");                    // removes it from the map
```

`keySet`, `values` and `entrySet` are all views of the map, and `subList` is a view of its list. They are
cheap, since nothing is copied, and they are the source of surprises when a caller keeps one and expects it
to be a snapshot.

## Modifying a collection while iterating

```java
for (String name : names) {
    if (name.isBlank()) {
        names.remove(name);          // ConcurrentModificationException
    }
}
```

A `for` loop over a collection uses an iterator, and the iterator detects a structural change and throws
rather than producing a wrong result. The ways out are `removeIf`, an explicit iterator with `iterator.remove()`,
or collecting the changes and applying them after the loop.

```java
names.removeIf(String::isBlank);
```

## Check yourself

Build a map of lists with `computeIfAbsent`, iterate it with an `entrySet` loop, and accumulate one key
three times with `merge`. Then hold a `subList` while removing from the parent list and explain what the
view shows.
