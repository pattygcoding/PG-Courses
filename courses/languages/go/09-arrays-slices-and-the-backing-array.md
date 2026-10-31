---
title: Arrays, slices and the backing array
summary: A slice is a view onto an array, which is why two of them can disagree about what they hold.
chapter: Types and values
minutes: 14
status: draft
---

## An array is a value, a slice is a window

```go
arr := [3]int{1, 2, 3}
arrCopy := arr
arrCopy[0] = 9
fmt.Println(arr, arrCopy)
```

```text
[1 2 3] [9 2 3]
```

An array's length is part of its type and it is copied on assignment, so `arrCopy` is a separate three integers. That is
why arrays are rare in Go: a function that takes an array copies it, and `[3]int` and `[4]int` are different types that no
function can accept both of.

A slice is a descriptor with three fields: a pointer to an array, a length and a capacity. Assigning a slice copies the
descriptor, so both slices point at the same array:

```go
s := []int{1, 2, 3}
sCopy := s
sCopy[0] = 9
fmt.Println(s, sCopy)
```

```text
[9 2 3] [9 2 3]
```

`len` is how much of the window is in use and `cap` is how far the window can grow. Allocating with a capacity is the
usual performance decision:

```go
a := make([]int, 2, 4)
fmt.Println(a, len(a), cap(a))
```

```text
[0 0] 2 4
```

`make([]int, 2, 4)` gives two usable elements and room for four, so two appends happen without an allocation.

## append shares the array when it can

```go
parent := []int{1, 2, 3, 4}
child := parent[:2]
child = append(child, 99)
fmt.Println(parent, child)
```

```text
[1 2 99 4] [1 2 99]
```

`child` has a length of 2 and a capacity of 4, because it is a window onto the same array as `parent`. The `append`
writes into the slot it already has room for, which is `parent[2]`. Nothing was copied and nothing was reported.

That is the single most surprising thing about Go and the source of a whole family of bugs. The version that makes the
sharing obvious is two appends onto the same slice:

```go
a := make([]int, 2, 4)
b := append(a, 1)
c := append(a, 2)
fmt.Println(b, c)
```

```text
[0 0 2] [0 0 2]
```

Both appends wrote to index 2 of the same array, so the second overwrote the first and `b` no longer shows the value it
was given. The fix in both cases is `slices.Clone` or a second `make` when the two slices have to be independent.

An `append` only reallocates when the capacity is exhausted, and the new capacity is chosen by a growth policy rather
than by a formula to rely on. That means the aliasing above happens only sometimes, which is why the bug reaches
production.

## Copying and cloning

```go
dst := make([]int, len(src))
n := copy(dst, src)
```

`copy` returns the number of elements copied, which is the smaller of the two lengths, and it handles overlapping ranges
correctly. `slices.Clone` is the modern version of the make-and-copy pair and it is generic:

```go
clone := slices.Clone(rows)
```

Use `slices.Clone` when the elements are values, and write the loop yourself when they are pointers or structs holding
pointers, because a clone copy shares what those point at.

## Limiting a slice

```go
full := []int{1, 2, 3, 4}
limited := full[1:2:3]
fmt.Println(limited, len(limited), cap(limited))
```

```text
[2] 1 2
```

The three-index form is `a[low:high:max]`, where `max` sets the capacity. It exists to stop an `append` from reaching into
the parent array, and a function that returns a sub-slice of a caller's data is where it belongs:

```go
func head(s []byte) []byte {
	return s[:16:16]
}
```

That function returns a slice whose `append` will allocate rather than write into the caller's buffer. Without the third
index, the returned slice can be appended to and the caller's array changes, which is the aliasing bug from the other
direction.

## A sub-slice keeps the whole array alive

```go
func firstRow(data []byte) []byte {
	return data[:4]
}
```

The returned slice holds a pointer into `data`, so the garbage collector keeps the entire array as long as that four-byte
window is reachable. For a 1 MB read that is 4 bytes kept and 1 MB retained, and the fix is to copy:

```go
return slices.Clone(data[:4])
```

This is the same trade as the aliasing: a view is free when the parent should stay alive and a leak when it should not.

## nil and empty are different in one place

```go
var nilSlice []int
emptySlice := []int{}
fmt.Println(nilSlice == nil, emptySlice == nil, len(emptySlice), cap(emptySlice))
```

```text
true false 0 0
```

Both have length zero and both are usable with `append`, `range` and `len`, so a function can accept either. The
difference shows in a comparison with `nil` and, more importantly, in JSON: a nil slice marshals to `null` and an empty one
to `[]`. A field in an API response is where that difference reaches a client.

The convention is to return a nil slice rather than an empty one, and to `var out []T` rather than `out := []T{}`, unless
`[]` is what the API must send.

## Copying, comparing and sorting

| Task | Function |
| --- | --- |
| copy a slice | `slices.Clone` |
| copy into an existing slice | `copy` |
| compare two slices | `slices.Equal`, `slices.EqualFunc` |
| find an element | `slices.Index`, `slices.Contains` |
| sort in place | `slices.Sort`, `slices.SortFunc` |
| sort a copy | `slices.Sorted` |
| remove a run of equal neighbours | `slices.Compact` |
| reverse in place | `slices.Reverse` |
| check every element | `slices.ContainsFunc`, `slices.IndexFunc` |

`slices.Equal` is the one that surprises people coming from another language: slices are not comparable with `==`, so
`s1 == s2` is a compile error unless the element type is not comparable, in which case it compares the descriptors rather
than the contents. `slices.Equal` compares the elements and is what you meant.

## Check yourself

Take a four-element slice, take a two-element window of it, append to the window, and print both. Then do the same with
`make([]int, 2, 4)` and two appends, and explain why the two results have the same value. Finally print a nil slice and an
empty slice with `%v` and marshal each to JSON.
