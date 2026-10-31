---
title: Choosing a collection
summary: What each implementation costs, what it preserves, and how to size one so it stops resizing.
chapter: Collections and streams
minutes: 13
status: draft
---

## The costs

| Implementation | Get by key or index | Insert | Remove | Order |
| --- | --- | --- | --- | --- |
| `ArrayList` | O(1) by index | O(1) at the end | O(n) | insertion |
| `ArrayDeque` | O(1) at both ends | O(1) at both ends | O(1) at both ends | insertion |
| `LinkedList` | O(n) | O(1) at both ends | O(n) | insertion |
| `HashMap` | O(1) average | O(1) average | O(1) average | none |
| `LinkedHashMap` | O(1) average | O(1) average | O(1) average | insertion or access |
| `TreeMap` | O(log n) | O(log n) | O(log n) | sorted by key |
| `HashSet` | O(1) average | O(1) average | O(1) average | none |
| `TreeSet` | O(log n) | O(log n) | O(log n) | sorted |

Start with `ArrayList` and `HashMap`. They cover most code, they have the best memory layout, and the
constant factor is smaller than the alternatives. Change when a specific requirement appears: order,
range queries, or removal from the middle at scale.

`LinkedList` is the one to avoid by reflex. It has the same complexity for an insert at the front, and it
stores a node per element with two pointers, so iterating it touches scattered memory and is several times
slower than an `ArrayList` for the same work. `ArrayDeque` is the right container for a stack or a queue,
and it is faster than both.

## Sorted containers answer range questions

```java
TreeMap<Instant, String> byTime = new TreeMap<>();

Instant from = Instant.parse("2024-03-01T00:00:00Z");
Instant to = Instant.parse("2024-04-01T00:00:00Z");

SortedMap<Instant, String> window = byTime.subMap(from, to);
System.out.println(byTime.firstKey() + " " + byTime.lastKey());
```

`subMap`, `headMap` and `tailMap` take a contiguous span in logarithmic time, which is the reason to pay
for `TreeMap` rather than sorting a list on every use. `NavigableMap` adds `floorKey`, `ceilingKey`,
`lowerEntry` and `higherEntry` for the nearest key on either side.

## A LinkedHashMap can be an LRU cache

```java
Map<String, Row> cache = new LinkedHashMap<>(16, 0.75f, true) {
    @Override
    protected boolean removeEldestEntry(Map.Entry<String, Row> eldest) {
        return size() > 100;
    }
};
```

The third constructor argument switches iteration to access order, so the least recently read entry is
first, and overriding `removeEldestEntry` evicts it. That is a bounded cache in six lines. The anonymous
subclass is the one place in Java where extending a collection class is normal practice.

## Enum keys have faster containers

```java
EnumMap<Level, Long> counts = new EnumMap<>(Level.class);
EnumSet<Level> loud = EnumSet.of(Level.LOUD);
```

`EnumMap` is backed by an array indexed by the constant's ordinal, so a lookup is an array read, and
`EnumSet` is a bit vector, so a membership test is a bitmask. Both are noticeably faster than the hash
based versions and enumerate in declaration order.

## Sizing avoids the resizing

```java
List<Row> rows = new ArrayList<>(expected);
Map<String, Row> byKey = new HashMap<>(expected * 4 / 3 + 1);
```

An `ArrayList` doubles its array when it fills, copying every element. Ten thousand adds with no capacity
estimate copy about twenty thousand elements. A `HashMap` resizes at a load factor of 0.75, rehashing every
key, so building it with the right capacity removes the rehashing.

An initial capacity estimate is one line and the win grows with the collection size. For a small list,
leave it alone.

## A priority queue for the top few

```java
PriorityQueue<Row> largest = new PriorityQueue<>(Comparator.comparingLong(Row::value));

for (Row row : rows) {
    largest.add(row);
    if (largest.size() > 10) {
        largest.poll();
    }
}
```

`PriorityQueue` keeps the smallest element at the head, so a bounded queue is the way to find the top ten
of a million rows without sorting any of them. `poll` removes the head in logarithmic time.

## Check yourself

Build a `TreeMap` keyed by a timestamp and run one range query. Then measure a loop of a hundred thousand
adds into an `ArrayList` with and without an initial capacity, and explain the difference in the numbers.
