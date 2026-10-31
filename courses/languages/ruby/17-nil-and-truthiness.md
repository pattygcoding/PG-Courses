---
title: nil and truthiness
summary: Two falsey values in the whole language, and the three idioms that keep nil out of the middle of a method.
chapter: Idioms
minutes: 13
status: draft
---

## Only two values are falsey

```irb
>> values = [nil, false, 0, "", [], {}]
>> values.map { |value| [value.inspect, value ? "truthy" : "falsey"] }
=> [["nil", "falsey"],
 ["false", "falsey"],
 ["0", "truthy"],
 ["\"\"", "truthy"],
 ["[]", "truthy"],
 ["{}", "truthy"]]
```

Zero is truthy. An empty string is truthy. An empty array is truthy. Coming from a language where `0` and `""` are
falsey, this is the source of the first bug in every Ruby program, and it is usually a check on a string that has
arrived empty from a form:

```ruby
if params[:name]
  save(params[:name])    # runs for ""
end
```

The fix is to ask the real question, which brings its own method:

```ruby
if params[:name].to_s.strip.empty?
  raise ArgumentError, "a name is required"
end

save(params[:name])
```

`nil?` asks whether the value is nil and nothing else:

```irb
>> "".nil?
=> false
>> !!nil
=> false
```

`!!` converts anything to a boolean, and it is worth knowing even though you rarely need it: `nil` and `false` stay
false and everything else becomes true.

## The safe navigation operator

```irb
>> name = nil
>> name&.upcase
=> nil
>> name&.upcase || "anonymous"
=> "anonymous"
```

`&.` sends the message only when the receiver is not nil, and returns nil otherwise. It is the compact form of a
two-line check, and it has a cost: a chain of `&.` hides which step returned nil. When the answer matters, one check
with a real message reads better than five question marks.

`&.` is for a value that may legitimately be absent. For a value that must be there, `fetch` names the problem at the
point it happens:

```ruby
config.fetch("data_dir")      # KeyError naming the key
options.fetch(:days, 14)      # a default, because absence is fine here
```

## The three other idioms

```irb
>> list = nil
>> (list ||= []).push(1)
=> [1]
>> [1, nil, 2].compact
=> [1, 2]
```

`||=` assigns when the left side is nil or false, which is how a method builds something once:

```ruby
def catalogue
  @catalogue ||= Store.new(directory).read_catalogue
end
```

The first call reads the file; later calls get the value. The catch is `false`: `@ready ||= true` runs the assignment
again on every call where `@ready` is false, which is usually not what you meant. Use `defined?(@ready)` or a
sentinel when false is a value you store.

`compact` removes the nils from a list, and it is the readable end of a `map` that sometimes has nothing to return:

```ruby
def names(records)
  records.map { |record| record["name"] }.compact
end
```

`dig` does the same for nested hashes:

```ruby
record.dig("member", "name")
```

## A rescue modifier that does less than it looks like

```irb
>> counts = {}
>> counts[:dune] += 1 rescue $!.class
(irb):10:in '<main>': undefined method '+' for nil (NoMethodError)
```

The error escaped the `rescue` entirely, which is the sort of thing the modifier form keeps hidden. `x += y rescue z`
covers a specific part of the expression, and the part it does not cover is the `+` that reads the old value and
finds nil. Two ways to write what was meant:

```ruby
counts[:dune] = counts.fetch(:dune, 0) + 1
```

```ruby
counts = Hash.new(0)
counts[:dune] += 1
```

The second is the one to reach for in a loop, and the modifier `rescue` is worth treating as a smell rather than a
tool: if a failure is expected, handle it; if it is not, let it be seen.

## A method that says what it needs

The most useful habit in this chapter is to push the check to the boundary and keep the body free of it:

```ruby
class Book
  def initialize(id:, title:, copies: 1)
    super
  end
end
```

A keyword with no default raises `ArgumentError: missing keyword: :title` before the body runs, so `Book` never exists
in a half-built state and nothing downstream checks whether `title` is nil. Every `&.` further down the file is a nil
that got past a boundary, and the boundary is where the fix belongs.

## Check yourself

Write a method that takes a hash of settings and returns the value for a key, using "none" when the key is absent or
the value is an empty string. Then write it a second way with `||=` and a default hash, and explain which one you
would keep in a file two other people read.
