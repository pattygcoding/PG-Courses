---
title: Blocks and iterators
summary: yield, the ampersand, the difference between a proc and a lambda, and an implicit parameter called it.
chapter: Core objects
minutes: 15
status: draft
---

## A method that takes code

```ruby
def with_each(values)
  values.each { |value| yield value }
end

with_each([1, 2]) { |n| print n }
```

```text
12=> [1, 2]
```

`yield` calls the block the caller supplied, and the method's own value is the last expression, which is why the
array comes back after the printed digits. `print` does not add a newline, so the output runs into the `irb` result;
that is the block working, not a bug in the shell.

A block is not an argument in the parameter list. It is a separate thing the method may call zero or more times, and
`block_given?` asks whether it is there:

```ruby
def maybe(&block)
  return "no block" unless block
  block.call(1)
end
```

```irb
>> maybe { |n| n + 1 }
=> 2
>> maybe
=> "no block"
```

The `&block` in the parameter list converts the block to a `Proc`, which is what you need when the block has to be
stored or passed on. Without it, `yield` is faster and reads better.

## Every iterator takes a block

`each`, `map`, `select`, `sort_by`, `each_with_object` and the rest are methods with a block parameter, and there is
nothing special about them beyond that. A method with no block where one is needed can return an enumerator instead,
and then the caller chooses how to consume it:

```ruby
def counter
  return to_enum(:counter) unless block_given?
  3.times { |i| yield i }
end
```

```irb
>> counter.to_a
=> [0, 1, 2]
>> counter { |i| print i }
012=> 3
```

`to_a` worked because `to_enum(:counter)` built an enumerator that calls the same method with a block when something
asks for values. Returning `to_enum` from a method with no block is the idiom that makes `each_slice(2).map(&:sum)`
possible on your own objects.

## The ampersand

```ruby
numbers.map(&:odd?)
```

`&:odd?` means "call `odd?` on each element". It is short, it works on any method taking no arguments, and it is
slower than a block when the block is a single method call on a variable you already have. Both are fine; reach for
`&:` when the method name says what the loop is doing.

The same `&` converts a proc to a block when passing it on:

```ruby
doubler = ->(n) { n * 2 }
[1, 2, 3].map(&doubler)
```

## Procs and lambdas

```irb
>> doubler = proc { |n| n * 2 }
=> #<Proc:0x000002833dee7088 (irb):22>
>> lam = lambda { |n| n * 2 }
=> #<Proc:0x000002833db6cb38 (irb):23 (lambda)>
>> doubler.lambda?
=> false
>> lam.lambda?
=> true
>> doubler.call(2, 3)
=> 4
>> lam.call(2, 3)
(irb):23:in 'block in <top (required)>': wrong number of arguments (given 2, expected 1) (ArgumentError)
```

Both are callable with `call`, `.()` or `[]`. Two differences:

- A lambda checks its argument count and a proc does not. The proc above took two arguments, used the first and
  ignored the second.
- `return` inside a lambda returns from the lambda. `return` inside a proc returns from the method that defined it,
  which can be a long way away and is the reason `->(n) { ... }` is worth preferring.

`->(n) { n * 2 }` is the lambda literal, and it is what the project uses wherever a callable is stored in a variable.

## The iterators worth knowing by heart

```irb
>> [1, 2, 3].each_with_object([]) { |n, list| list << n * 2 }
=> [2, 4, 6]
>> [1, 2, 3].reduce(0) { |total, n| total + n }
=> 6
>> [1, 2, 3].reduce(:+)
=> 6
>> [1, 2, 3].filter_map { |n| n * 2 if n.odd? }
=> [2, 6]
>> [1, 2, 3].each_slice(2).map(&:sum)
=> [3, 3]
>> [1, 2, 3].each_with_index.map { |n, i| n * i }
=> [0, 2, 6]
```

`each_with_object` carries a second value through the loop, which is the cleanest way to build a hash or a string
from a list. `reduce` folds a list into one value. `filter_map` selects and maps in one pass, dropping the nils the
block returns. `each_with_index` hands back an enumerator, which is why the `map` chained onto it works.

Two more that keep a method readable:

```irb
>> "northside".then { |name| name.upcase }
=> "NORTHSIDE"
>> [3, 1, 2].tap { |list| list.sort! }
=> [1, 2, 3]
```

`then` passes a value into a block and returns the block's result, which turns nested calls into a readable chain.
`tap` returns the receiver and exists to run something for its side effect on the way past.

## The implicit parameter

Ruby 3.4 lets a block with one argument leave out the parameter list and call the argument `it`:

```irb
>> 5.times.map { it * 2 }
=> [0, 2, 4, 6, 8]
```

`it` is available only when the block takes exactly one argument and does not name it. Naming it `_` is the older way
to say the same thing. Where the block is longer than a line, naming the parameter is still clearer.

## Check yourself

Write a method `catalogue_summary(books)` that takes a list of book-like objects and yields each one to a block if a
block is given, returning the count. Then write the same method with `&block` instead of `yield` and explain the
difference between the two when the caller passes a lambda rather than a block.
