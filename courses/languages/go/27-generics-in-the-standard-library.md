---
title: Generics in the standard library
summary: The slices, maps and cmp packages, and the honest answer to when a type parameter helps.
chapter: Generics
minutes: 13
status: draft
---

## The three generic packages

```go
import (
	"cmp"
	"maps"
	"slices"
)
```

`slices`, `maps` and `cmp` arrived in Go 1.21 and they are the generic standard library. The functions on a slice that used
to be hand-written loops are all there, and they work on any element type with the right constraint.

```go
nums := []int{3, 1, 2}
slices.Sort(nums)
fmt.Println(nums, slices.Contains(nums, 2), slices.Max(nums))
```

```text
[1 2 3] true 3
```

The list from `go doc slices`, grouped by what you would use it for:

| Task | Functions |
| --- | --- |
| sort in place | `Sort`, `SortFunc`, `SortStableFunc` |
| sort a copy | `Sorted`, `SortedFunc` |
| search | `Index`, `IndexFunc`, `Contains`, `ContainsFunc`, `BinarySearch` |
| compare | `Equal`, `EqualFunc`, `Compare`, `CompareFunc`, `IsSorted` |
| copy | `Clone`, `Grow`, `Clip` |
| edit in place | `Delete`, `DeleteFunc`, `Insert`, `Replace`, `Reverse`, `Compact` |
| combine | `Concat`, `Repeat` |
| extremes | `Min`, `Max`, `MinFunc`, `MaxFunc` |
| iterators | `All`, `Backward`, `Values`, `Collect`, `Chunk`, `AppendSeq` |

`Sort` returns nothing and `Sorted` returns a new slice, which is the difference to watch: a call to `slices.Sort(rows)` on a
slice the caller is still using changes it.

```go
func byKey(a, b Row) int {
	return cmp.Compare(a.Key, b.Key)
}

slices.SortFunc(rows, byKey)
```

`cmp.Compare` returns -1, 0 or 1 and is the function to use inside a comparison rather than writing the branches, because it
handles the string and float cases correctly including `NaN`.

## maps and cmp

```go
ages := map[string]int{"b": 2, "a": 1}

fmt.Println(slices.Sorted(maps.Keys(ages)))
fmt.Println(maps.Equal(ages, map[string]int{"a": 1, "b": 2}))
```

```text
[a b]
true
```

`maps.Keys` and `maps.Values` return iterators, so `slices.Sorted` or `slices.Collect` is the step that turns one into a
slice. `maps.Clone`, `maps.Copy`, `maps.Equal`, `maps.DeleteFunc` and `maps.Insert` are the rest of the package, and
`maps.Equal` is the one that removes the most hand-written code because comparing two maps by hand is six lines.

`cmp.Ordered` is the constraint behind `slices.Sort`, `slices.Max` and everything else that needs `<`, and it is the reason
a sort of a `[]string` needs no comparison function.

## The iterator functions

```go
for i, v := range slices.Backward(nums) {
	fmt.Println(i, v)
}
```

`slices.Backward` returns a `iter.Seq2` that yields the index and the value, and `range` over it works because Go 1.23 made
`range` accept a function with that signature. `slices.Chunk` splits a slice lazily, `slices.Collect` builds a slice from an
iterator, and `maps.All` iterates a map.

The one to know by shape is `iter.Seq[E]`, which is `func(func(E) bool)`: an iterator is a function that calls a yield
function, and `range` over a function stops when the yield returns false. That is the whole protocol, and it is worth
reading once because a custom iterator is ten lines.

## Writing your own generic helper

```go
func GroupBy[T any, K comparable](values []T, key func(T) K) map[K][]T {
	out := make(map[K][]T)

	for _, v := range values {
		k := key(v)
		out[k] = append(out[k], v)
	}

	return out
}
```

That is the standard shape of a useful generic helper: a slice in, a map out, and a function parameter that supplies the
part the helper cannot know. It is five lines and it replaces a hand-written loop at every call site.

The version with a `key` of type `K comparable` is the pattern worth copying: `comparable` for the map key, `any` for
everything else, and a function to extract the key.

## When a type parameter is the wrong answer

- **A function with one call site.** The concrete version is shorter and the errors name the type.
- **A function whose body needs type-specific behaviour.** A generic function cannot switch on `T` without a conversion, so
  the constraint has to provide everything, which usually means an interface is the right answer instead.
- **A helper for one type.** `func FirstRow(rows []Row) Row` is clearer than `func First[T any](s []T) T` for a single use.
- **Anything where an interface already works.** A function taking `io.Writer` is generic over every writer and needs no type
  parameter.
- **A container with one instantiation.** Generic machinery in exchange for nothing.

The rule I use, which is the same as the one from the TypeScript course: a type parameter earns its place when it carries a
relationship between two positions, or when it lets a function work for many types without losing the type. If the body
cannot do anything with `T` that a concrete type could not, the parameter is decoration.

## Why the language added them late

Generics arrived in Go 1.18, and the two packages that make them pay are `slices` and `maps`. Before that, the answer for a
container of `any` was an interface value with an assertion at every use, and the answer for a sortable slice was
`sort.Slice` with a closure and a `reflect`-based swap underneath.

The reason it took five years is the compatibility promise: the design has to work with every existing type, interface and
method set, and the constraint syntax is a type set rather than a parameterised class. Reading the constraint rules is the
price of that, and the two packages above are what it bought.

## Check yourself

Sort a `[]Row` with `slices.SortFunc` and a comparison written with `cmp.Compare`, then sort a `[]string` with
`slices.Sort` and no comparison function. Write `GroupBy` and call it with two element types, then find a hand-written loop
in a codebase and see whether one of the `slices` functions replaces it.
