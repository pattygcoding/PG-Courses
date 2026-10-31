---
title: Numbers and ranges
summary: Integer division, floating point that does not add up, and a range that can be endless.
chapter: Core objects
minutes: 13
status: draft
---

## Four kinds of number

```irb
>> 10 / 3
=> 3
>> 10.0 / 3
=> 3.3333333333333335
>> 10.fdiv(3)
=> 3.3333333333333335
>> 7.divmod(3)
=> [2, 1]
```

Integer division throws the remainder away, which is the single most common surprise in the language. `fdiv` asks
for a float, and `divmod` hands back both halves so you do not have to compute them twice.

Arithmetic on integers is arbitrary precision, so there is no 64-bit wall to hit:

```irb
>> 2**64
=> 18446744073709551616
>> 1_000_000
=> 1000000
```

Underscores in a number literal are ignored and exist to make long numbers readable. Writing `1000000` and
`1_000_000` produces the same integer.

Remainders keep their sign, which is the behaviour that keeps arithmetic consistent:

```irb
>> -7 % 3
=> 2
```

That looks wrong until you check it: `-7 == 3 * -3 + 2` holds, so the division still adds up. If you want a
positive remainder, `+` the divisor once and `%` again, or use `divmod` and read both parts.

## Floating point does what floating point does

```irb
>> 0.1 + 0.2
=> 0.30000000000000004
>> 0.1 + 0.2 == 0.3
=> false
```

Binary floating point cannot represent `0.1` exactly, and every language built on it behaves the same way. Two ways
out. Round at the edge where the value becomes text, or use a type that is exact:

```irb
>> (0.1 + 0.2).round(1)
=> 0.3
>> Rational(1, 3) + Rational(1, 6)
=> (1/2)
```

`Rational` is exact and slower. For money, the usual answer is to store whole units as integers, and the usual
second answer is `BigDecimal` from the standard library, which trades speed for decimal exactness.

## Parsing text into a number

```irb
>> Integer("42")
=> 42
>> Integer("4.2")
<internal:kernel>:288:in 'Kernel#Integer': invalid value for Integer(): "4.2" (ArgumentError)
>> 42.to_s(2)
=> "101010"
```

`Integer()` raises rather than returning zero, which is what you want at a boundary. A command line argument that
should be a number either is one or stops the program with a message, and `to_i` is the permissive version that turns
`"4.2"` into `4` and `"nope"` into `0` without saying anything. Use `to_i` on data you have already decided is
clean, and `Integer()` on anything a user typed.

`to_s(2)` writes a number in base two. The same method takes any base from 2 to 36.

## Ranges

```irb
>> (1..5).to_a
=> [1, 2, 3, 4, 5]
>> (1...5).to_a
=> [1, 2, 3, 4]
>> (1..).first(3)
=> [1, 2, 3]
>> (...5).include?(3)
=> true
>> (1..10).step(3).to_a
=> [1, 4, 7, 10]
>> ("a".."e").to_a
=> ["a", "b", "c", "d", "e"]
```

Two dots include the end, three exclude it, and either end can be left out. An endless range is lazy, which is why
`(1..).first(3)` answers immediately while `(1..).to_a` has no list to build:

A range is not only a way to build a list. It answers `cover?`, which is the fast answer to "is this value in the
interval", and it can be indexed and compared:

```irb
>> (1..5).sum
=> 15
>> 3.between?(1, 5)
=> true
>> (1..5).cover?(2.5)
=> true
>> (1..5).cover?(6)
=> false
```

`between?` and `cover?` are close relatives. `cover?` asks about the interval and works with a float in the middle
of it, while `include?` on a range of integers checks membership.

Endless and beginless ranges turn up wherever a comparison would otherwise need two bounds, and the Rails course
uses a beginless one to mean "anything before today":

```ruby
scope :overdue, -> { current.where(due_on: ...Date.current) }
```

## Check yourself

Work out what `-7.divmod(3)` returns before running it, then check your answer. Then write a method that takes a
year and returns `true` for a leap year, using integer arithmetic rather than a date library, and test it against
1900 and 2000.
