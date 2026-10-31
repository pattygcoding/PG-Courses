---
title: Enumerable in depth
summary: Lazy enumerators, the handful of methods worth memorising, and how to make your own class enumerable.
chapter: Idioms
minutes: 14
status: draft
---

## Laziness

```irb
>> (1..).lazy.map { |n| n * 2 }.select { |n| n % 3 == 0 }.first(3)
=> [6, 12, 18]
>> (1..Float::INFINITY).lazy.select(&:even?).first(3)
=> [2, 4, 6]
>> (1..).lazy.class
=> Enumerator::Lazy
```

An endless range with `lazy` in the chain is where this earns its keep. Nothing is computed until `first(3)` asks for
three values, so the pipeline walks the integers, doubles them, keeps the multiples of three, and stops. Without
`lazy` the `map` would try to build a list of every integer first.

The chain is a pipeline, and each step hands one value to the next rather than a whole list:

```ruby
def lines
  @catalogue.lazy.map { |book| "#{book.title} - #{book.copies} on the shelf" }.first(5)
end
```

That is the report in this project, and the `lazy` matters because a catalogue can be long while the report only
prints five rows.

`each_slice` and `each_cons` build their own pipelines:

```irb
>> (1..).lazy.map { |n| n }.each_slice(3).first
=> [1, 2, 3]
>> [1, 2, 3, 4, 5].each_cons(2).to_a
=> [[1, 2], [2, 3], [3, 4], [4, 5]]
>> [1, 2, 4, 5, 7].chunk_while { |a, b| b == a + 1 }.to_a
=> [[1, 2], [4, 5], [7]]
```

`each_slice` groups by position, `each_cons` gives every overlapping pair, and `chunk_while` starts a new group
whenever the block says the run is broken. `chunk_while` is the readable way to turn a list of dates into runs of
consecutive dates.

## The methods worth memorising

```irb
>> [1, 2, 3].flat_map { |n| [n, n] }
=> [1, 1, 2, 2, 3, 3]
>> %w[dune edda].each_with_index.to_h
=> {"dune" => 0, "edda" => 1}
>> [3, 1, 2].find_index(1)
=> 1
>> [1, 2, 3].inject(:+)
=> 6
>> (%w[dune edda] * 2).size
=> 4
```

- `flat_map` maps and flattens one level, which is what you want when each element expands into a list.
- `each_with_index.to_h` turns a list into a hash of element to position.
- `inject(:+)` is `reduce`'s other name. `reduce` with a block when the accumulator needs explaining, `sum` when it
  is addition.
- `Array#*` with an integer repeats the list, which is a quick way to build test data.

The rest of the practical set, without transcripts, because each one behaves as the name says:

| Method | Returns |
| --- | --- |
| `each_entry`, `each_slice(n)`, `each_cons(n)` | enumerators of groups |
| `zip(other)` | pairs of elements, one from each list |
| `group_by`, `partition`, `chunk_while`, `slice_when` | groupings |
| `tally`, `sum`, `count`, `min_by`, `max_by` | numbers and elements |
| `select`, `reject`, `filter_map`, `find`, `take_while`, `drop_while` | subsets |
| `sort_by`, `uniq`, `flatten`, `compact` | shape changes |

## Enumerable in your own class

```ruby
class Catalogue
  include Enumerable

  def each(&block)
    @books.each_value(&block)
  end
end
```

`each` is the contract. Everything else, from `map` to `tally` to `sort_by`, comes from `Enumerable` and works because
it is written in terms of `each`. The two methods worth adding by hand are the ones `Enumerable` cannot do better:

```ruby
def size
  @books.size
end
alias_method :length, :size

def empty?
  @books.empty?
end
```

Without `size`, `Enumerable#count` walks the collection. With it, `catalogue.size` is a hash lookup.

Make sure `each` returns something sensible when no block is given:

```ruby
def each(&block)
  return to_enum(:each) unless block

  @books.each_value(&block)
end
```

That is what makes `catalogue.each_with_index` work, and it is the difference between a collection that behaves like
an array and one that almost does.

## A warning about measuring too early

`lazy` costs a little per element, so a plain `map` over a short list is the faster version and the shorter one. Two
habits cover both cases: use `lazy` when the source is endless or the pipeline would otherwise build a list nobody
reads, and use `first(n)` or `take_while` in place of `select` when only the first few answers matter.

## Check yourself

Write a method that takes an endless enumerator of whole numbers and returns the first five that are divisible by 7
and whose digits sum to 10, using a lazy chain. Then make `Catalogue#each` return an enumerator when no block is given
and check that `catalogue.each_with_index` works.
