---
title: Maps
summary: The nil map that panics, the missing key that does not, and the order that is never the same twice.
chapter: Types and values
minutes: 13
status: draft
---

## Creating a map and using one

```go
ages := map[string]int{"a": 1, "b": 2}
ages["c"] = 3
fmt.Println(ages["a"], ages["missing"], len(ages))
```

```text
1 0 3
```

A map literal covers the common case, and `make(map[string]int)` is the other way to get one. Reading a key that is not
there returns the value type's zero value rather than an error, which is convenient and is why the comma-ok form exists.

```go
n, ok := ages["missing"]
fmt.Println(n, ok)
```

```text
0 false
```

The second value says whether the key was present, which is the only way to tell an absent key from one whose value is the
zero value. That distinction matters for a count of zero and for a `map[string]bool` used as a set.

## The nil map panics on write

```go
var counts map[string]int
counts["a"] = 1
```

```text
panic: assignment to entry in nil map
```

Reading from a nil map is fine and returns zero values, `len` is zero, and `range` does nothing. Writing to one panics
with the message above, because there is no map to write into. This is the one place the zero value is not usable, and the
fix is a literal or `make`.

A map passed to a function is a reference, so filling a map argument works with no pointer involved:

```go
func fill(m map[string]int) { m["a"] = 1 }
```

## Deleting and iterating

```go
delete(ages, "a")
```

```go
for key, value := range ages {
	fmt.Println(key, value)
}
```

`delete` on a key that is not there is a no-op, so no check is needed. Ranging over a map yields the keys in an order that
changes between runs and can change between two loops in the same function:

```go
m := map[string]int{"a": 1, "b": 2, "c": 3, "d": 4}

for k := range m {
	fmt.Print(k, " ")
}
```

```text
d a b c
```

Three runs of that program printed `d a b c`, `b c d a` and `d a b c`. Go randomises the start of the iteration
deliberately, so code that depends on the order is a bug that appears under load rather than in the test.

```go
for _, key := range slices.Sorted(maps.Keys(ages)) {
	fmt.Println(key, ages[key])
}
```

That is the deterministic version. `maps.Keys` returns an iterator and `slices.Sorted` gives a sorted slice, so the pair
is the idiom for a stable order. Sorting by value needs `slices.SortFunc` over a collected slice of key-value pairs.

## A struct in a map is not addressable

```go
m := map[string]Row{"a": {Key: "a"}}
m["a"].Key = "b"
```

```text
slices\main.go:37:2: cannot assign to struct field m["a"].Key in map
```

The compiler refuses because a map's storage can be reorganised when it grows, so the address of an element is not stable
and a writable reference to a field cannot exist. The fix is to read the whole value, change it and write it back:

```go
row := m["a"]
row.Key = "b"
m["a"] = row
```

For a struct that is expensive to copy, or one that has to be shared, the map value is a pointer:

```go
m := map[string]*Row{"a": {Key: "a"}}
m["a"].Key = "b"
```

That compiles because the pointer is the value in the map and the struct it points at is addressable. It also means the
map and the world share the struct, which is the trade: a pointer value is mutable in place and is not copied when the map
is.

## What can be a key

```go
type Key struct {
	ID   string
	Slot int
}

seen := map[Key]bool{}
```

A key has to be comparable, which means a `string`, a number, a boolean, a pointer, an interface whose dynamic type is
comparable, a channel, an array of comparable things, or a struct whose fields are all comparable. A slice, a map or a
function cannot be a key, and the compiler says so:

```text
invalid map key type []int
```

`int` and `float64` keys work, and `math.NaN()` is a key that can never be found again because it is not equal to itself.
Comparing floating point for map keys is a bug in waiting.

A struct key is the useful case: a composite key is a struct rather than a concatenated string, and it costs no
allocation to build.

## A map is not safe for concurrent writes

```go
go func() { m["a"] = 1 }()
go func() { m["b"] = 2 }()
```

```text
fatal error: concurrent map writes
```

That is a fatal error rather than a panic, so `recover` does not catch it and the process dies. Go's runtime detects the
concurrent write when it can and reports it, which is a deliberate crash rather than a corrupted map.

The fixes are the ones from the concurrency chapter: a `sync.Mutex` around every access, a `sync.Map` for the
read-mostly case, or a single goroutine that owns the map and communicates through channels. A `map` read concurrently
with no writes is safe, which is the version to build for a lookup table that is filled before the goroutines start.

## What the maps package adds

| Function | For |
| --- | --- |
| `maps.Clone` | a shallow copy |
| `maps.Copy` | copy into an existing map |
| `maps.Equal` | compare two maps by key and value |
| `maps.Keys`, `maps.Values` | iterators over the keys or values |
| `maps.DeleteFunc` | delete every pair matching a predicate |
| `maps.Collect` | build a map from an iterator of pairs |

`maps.Equal` and `maps.Clone` are the two that remove the most hand-written code, and both were added in Go 1.21 with the
rest of the generic helpers.

## Check yourself

Read a missing key from a map with and without the comma-ok form. Then write to a nil map and read the panic, fill a map
passed to a function, and print the keys twice with a range to see the order change. Finally try to change a struct field
through the map and use the read-modify-write instead.
