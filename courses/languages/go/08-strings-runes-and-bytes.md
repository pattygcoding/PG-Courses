---
title: Strings, runes and bytes
summary: A Go string is bytes, ranging over one gives runes, and the two indices do not agree.
chapter: Types and values
minutes: 13
status: draft
---

## len is bytes, not characters

```go
s := "héllo"

fmt.Println(len(s), utf8.RuneCountInString(s))
```

```text
6 5
```

Five characters and six bytes, because `é` is two bytes in UTF-8 and the other four are one each. `len` on a string is
always the number of bytes, and a string in Go is immutable and holds arbitrary bytes rather than characters. It does not
have to be valid UTF-8 at all, and a string built from binary data is a legitimate string.

## range decodes, indexing does not

```go
for i, r := range s {
	fmt.Printf("%d:%q ", i, r)
}
```

```text
0:'h' 1:'é' 3:'l' 4:'l' 5:'o'
```

Look at the indices: there is no `2`. Ranging over a string decodes UTF-8 and gives the byte index of the start of each
rune, so the index after a multi-byte character moves by more than one. The value is a `rune`, which is what you want for
text.

```go
for i := 0; i < len(s); i++ {
	fmt.Printf("%d:%d ", i, s[i])
}
```

```text
0:104 1:195 2:169 3:108 4:108 5:111
```

Indexing a string gives a `byte`, so this loop reports six values and the two halves of an encoded character. `s[1]` is `195`
and `s[2]` is `169`, which are not characters at all:

```go
fmt.Println(s[0], s[1], s[2])
fmt.Println(string(s[1]))
```

```text
104 195 169
```

The second print converts one byte to a string, which produces a one-byte string that is not valid UTF-8. It compiles and it
prints something, which is why this bug reaches a log file rather than failing loudly. To get the character back from a byte
position you need the two-byte slice, `s[1:3]`, or the `rune` from a range.

The rule that follows: range over a string when you mean characters, index it when you mean bytes, and never assume the
two are the same.

## The four conversions

```go
bs := []byte(s)
rs := []rune(s)

fmt.Println(len(bs), len(rs))
fmt.Println(string(bs), string(rs))
```

```text
6 5
héllo héllo
```

`[]byte(s)` copies the bytes and `[]rune(s)` decodes to code points, and both are copies rather than views. A conversion
back to `string` produces the same text, so a round trip through `[]rune` is a way to normalise a string's encoding, at
the cost of an allocation of four bytes per rune.

Those four conversions are where the allocation is worth knowing about: a loop that does `s[n]` on a `[]byte` this way
copies the whole string each time. Holding one `[]rune` and indexing it is the version for random access into text.

## The strings package works on UTF-8

```go
fmt.Println(strings.ToUpper(s))
fmt.Println(strings.EqualFold("A", "a"))
fmt.Println(strings.Contains(s, "é"))
```

```text
HÉLLO
true
true
```

`ToUpper` and `ToLower` are Unicode-aware, `EqualFold` compares case-insensitively including the foldings that are not a
simple case change, and `Contains` matches the two-byte sequence because it works on bytes of a UTF-8 string. The package
is worth reading for the functions people reimplement: `TrimPrefix`, `CutPrefix`, `Cut`, `Fields`, `Index` and
`Sprint`-style formatting.

For sorting and comparing text properly, `strings.ToUpper` is not enough, and `golang.org/x/text/collate` is the package
that does it. A byte comparison of two UTF-8 strings orders them by code point, which is a defensible order and not a
linguistic one.

## Building a string

```go
var sb strings.Builder
for _, r := range rs {
	sb.WriteRune(r)
}
fmt.Println(sb.String(), sb.Len())
```

```text
héllo 6
```

`strings.Builder` accumulates with `WriteString`, `WriteRune`, `WriteByte` and `Write`, and `Len` is the number of bytes
written so far. A string is immutable, so `s += x` in a loop allocates a new string and copies the old one each time,
which is quadratic in the number of iterations. The builder is the answer for a loop, and it is worth knowing that
`slices.Concat` and `strings.Join` cover the two cases that are not a loop.

The builder returns a `string` from `String` and it is not safe for concurrent use. It also has a `Grow` method, which
reserves capacity when the final size is known, and a `bytes.Buffer` is the same thing for bytes and satisfies
`io.Writer`.

## Strings are comparable and map keys work

```go
seen := map[string]bool{}
seen["héllo"] = true
fmt.Println(seen["héllo"], "héllo" == "h\u00e9llo")
```

```text
true true
```

Strings are comparable with `==`, so a `map[string]T` works with no hashing function to provide, and an escape sequence
and its character compare equal because they are the same bytes.

Two strings that look identical can still differ in bytes, which is what Unicode normalisation means: `é` as one code point
and `e` plus a combining accent are visually the same and not `==` to each other. That is a real source of a bug in a
system that accepts text from more than one place, and `golang.org/x/text/unicode/norm` is the package that fixes it.

## Check yourself

Take a string with an accented character and print `len`, `utf8.RuneCountInString`, and both loops. Then compare the
output of indexing with the output of ranging, and explain the byte indices that range produced.
