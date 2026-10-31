---
title: Iterators
summary: The trait behind every for loop, and the three ways to walk a collection.
chapter: Collections and iterators
minutes: 13
status: draft
---

## The Iterator trait

```rust
trait Iterator {
    type Item;

    fn next(&mut self) -> Option<Self::Item>;
}
```

That is the whole interface. Everything else, `map`, `filter`, `take`, `fold`, is a provided method built on
`next`. An iterator produces `None` when it is exhausted, and calling `next` afterwards may panic or may keep
returning `None`, so treat an exhausted iterator as finished.

## A for loop is an iterator loop

```rust
for value in values {
    println!("{value}");
}
```

desugars to

```rust
let mut iter = IntoIterator::into_iter(values);
while let Some(value) = iter.next() {
    println!("{value}");
}
```

`IntoIterator` is what makes a value usable in a `for` loop, and it is why an array, a `Vec` and a `&Vec` all
work without the loop changing.

## The three ways to walk a collection

```rust
let values = vec![String::from("a"), String::from("b")];

for value in &values {              // &String, the vector is unaffected
    println!("{value}");
}

for value in &mut values {          // &mut String, change in place
    value.push('!');
}

for value in values {               // String, the vector is consumed
    println!("{value}");
}
```

`values.iter()` is the same as `&values`, `values.iter_mut()` as `&mut values`, and `values.into_iter()` as
`values`. A `for` loop over a borrowed collection is the default; iterating by value is for when the collection
is finished with.

## A function returning an iterator

```rust
fn numbers(input: &str) -> impl Iterator<Item = u64> + '_ {
    input
        .split(',')
        .filter_map(|part| part.trim().parse().ok())
}
```

`impl Iterator` in return position names the iterator type without writing out the nested adapter types, which
are unreadable and change when you edit the chain. The `+ '_` ties the returned iterator to the borrowed input,
because the iterator borrows the string it splits.

## Writing an iterator

```rust
struct Countdown(u32);

impl Iterator for Countdown {
    type Item = u32;

    fn next(&mut self) -> Option<u32> {
        if self.0 == 0 {
            return None;
        }

        self.0 -= 1;
        Some(self.0 + 1)
    }
}

let values: Vec<u32> = Countdown(3).collect();
println!("{values:?}");        // [3, 2, 1]
```

Implementing `next` gives you every adapter and every method on `Iterator` for free, which is the reason the
standard library has one trait rather than a method per operation.

## Check yourself

Write a struct holding a `Vec<String>` and implement `IntoIterator` for a reference to it, then use it in a `for`
loop. Implement `Iterator` for a small custom type and collect it into a `Vec`.
