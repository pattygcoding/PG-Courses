---
title: The type system at a glance
summary: Static types, value and reference types, and the four categories almost every type falls into.
chapter: Getting started
minutes: 13
status: draft
---

## Types are checked before the program runs

```csharp
int count = "three";
```

That line fails to compile, not at run time, and the error names the file, the line and the two types
involved. The whole design of the language follows from that: a mistake is cheaper to fix before the
program ships, and the compiler can work out most of what you meant from the types alone.

`var` does not change this. It asks the compiler to infer the type from the initialiser, and the type is
still fixed:

```csharp
var total = 0;       // int, for the rest of the method
var name = "ada";    // string
```

## Value types copy, reference types point

```csharp
struct Point { public int X; public int Y; }
class Player { public int Score; }

var a = new Point { X = 1 };
var b = a;
b.X = 99;
Console.WriteLine(a.X);      // 1

var p = new Player { Score = 1 };
var q = p;
q.Score = 99;
Console.WriteLine(p.Score);  // 99
```

Assigning a struct copies its fields, so `a` and `b` are separate. Assigning a class copies the
reference, so `p` and `q` name the same object. Most built-in numbers, `bool`, `char`, `DateTime` and
your own `struct` are value types. `string`, arrays, `List<T>`, delegates and your own `class` are
reference types.

## The four categories

| Category              | Examples                        | Notes                                    |
| --------------------- | ------------------------------- | ---------------------------------------- |
| Value, simple         | `int`, `double`, `bool`, `char` | Copied on assignment                     |
| Value, composite      | `struct`, `DateTime`, tuples    | Copied, so keep them small               |
| Reference, sealed-ish | `string`                        | Reference type that behaves like a value |
| Reference, mutable    | `class`, arrays, `List<T>`      | Shared when assigned                     |

`string` is the odd one: it is a reference type and immutable, so `==` compares the characters and no
call can change the text you passed in. That is why a string parameter is safe to hand to untrusted
code and a `List<T>` parameter is not.

## Nullability is part of the type

```csharp
string name = null;        // warning when nullable is enabled
string? maybe = null;      // allowed, and the compiler makes you check
```

The `?` is a real part of the type, checked at compile time and enforced nowhere at run time. It is a
promise the compiler helps you keep, which is the subject of a lesson of its own.

## Check yourself

Write a `struct` and a `class` with the same field, assign each to a second variable, change the second,
and print both. Then explain why one changed and the other did not.
