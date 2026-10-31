---
title: What Ruby is
summary: A language where everything is an object, a block is an argument, and a ported build can still run the same code.
chapter: Getting started
minutes: 13
status: draft
---

## The language in three decisions

Ruby was designed in 1993 around one idea, that a programmer should be happy, and the syntax follows from it
rather than from a grammar textbook. Three decisions account for most of what the language looks like.

**Everything is an object.** There are no primitives. `3` is an object that responds to `+`, `nil` is an object that
responds to `to_a`, and a class is an object too. That is why a method can be called on anything without a
compiler rule about which types are allowed:

```ruby
books = [ "Dune", "The Poetic Edda" ]
books.sum { |title| title.length }
```

**A block is an argument.** There is no `for` keyword that matters. Iteration is a method that takes code:

```ruby
books.each { |title| puts title }
books.each do |title|
  puts title.upcase
end
```

Both forms are the same argument. That single decision is why `map`, `select`, `each_with_object` and `tally` feel
like language keywords when they are ordinary methods on `Array`.

**Convention replaces configuration.** A file named `northside/store.rb` defines `Northside::Store`. A method ending
in `?` answers a question and returns true or false. A method ending in `!` either changes the receiver or raises.
None of this is enforced by the parser, and all of it is expected by every library you will read.

## What runs the code

The implementation on this machine is CRuby, sometimes called MRI, and its version string names the two features
worth knowing about:

```text
ruby 3.4.7 (2025-10-08 revision 7a5688e2a2) +PRISM [x64-mingw-ucrt]
```

- `+PRISM` is the parser. Prism replaced the old generated parser in Ruby 3.4, and it is why error messages now
  underline the exact expression that failed rather than a line number.
- `[x64-mingw-ucrt]` is the platform. This is the Windows build from RubyInstaller.
- An `+YJIT` would appear there if the compiler that turns hot methods into machine code had been built into this
  Ruby. It has not, and the performance page shows how to check.

Other implementations run the same programs. JRuby runs on the JVM and gives you real threads. TruffleRuby is
often faster on long-running work. Both matter when you need to call Java or when one process has to use every
core, and neither changes the code you write.

## The versions

```text
4.0.9    current line, released 2026-10-23
3.4.12   the 3.4 line, patched on the same day
3.3.13   the 3.3 line, still patched
```

This machine has 3.4.7, which is a patch release behind 3.4.12 and the same code line. Nothing in this course needs
4.0. Where a version changes an answer the page says so, and the version directory in `gem env` is how Ruby keeps
two versions of a library apart.

## What Ruby is used for

Rails is the largest thing written in Ruby, and it is a separate course in this catalogue because it is a subject
of its own. Outside that, Ruby is the language people reach for when a task is mostly text, files and an API: a
report generator, a deploy script, a tool that reads JSON and writes CSV, a small service. The standard library
covers all of that, which is what this course uses.

The refusal to add ceremony is the reason. A script that reads a file, filters it and prints a summary is a dozen
lines, and the same script can grow into a tested gem without being rewritten. The course builds exactly that: a
command line tool for a library, from the first `puts` to a built gem with an executable, and it stays recognisable
from beginning to end.

## Check yourself

Run `ruby -v` and read the parts: the version, the patch date, the parser, and the platform in brackets. Then run
`ruby -e 'puts 3.class, nil.class, self.class'` and explain each line. The third one is the surprising one.
