---
title: Ruby
level: Beginner
summary: Write Ruby that reads like Ruby, with objects, blocks, the standard library, gems and tests behind a tool worth shipping.
labels:
  - Language
  - Automation
  - Data
minutes: 18
status: draft
---

## What this course is

Ruby is a small language with a large standard library and a strong opinion about how code should read. Almost
everything in it is an object with methods, so `books.sum` works on an array and `books.max_by { |book| book.copies }`
works too. The language's own syntax bends to that idea rather than the other way round.

Three things shape every Ruby program, and they are what this course spends its time on:

- A method call is a message, so a program is mostly objects sending messages to each other. `loan.overdue?` is not
  a property lookup; it is a question asked of an object that knows how to answer it.
- A block is an argument. Loops are written as `books.each { |book| puts book }` because the method takes the code
  rather than the language having a loop keyword to wrap it.
- Convention replaces configuration. A file called `librarian.rb` defines `Librarian`, a method ending in `?` answers
  a question, and a method ending in `!` changes something or fails loudly.

This course covers the language, its standard library, and the tooling that belongs to it: irb, gems, Bundler,
Minitest, Rake and packaging. The web framework is a separate course. Rails is built on this language and adds its
own conventions, and it is worth learning Ruby first so that the framework's magic has something to attach to. The
Rails course names this one at its start; the two together are the whole stack.

## Who it is for

You have written code in another language and want to write Ruby rather than Python with `end` in it.

Nothing here assumes you have used blocks, modules, symbol keys or a test framework. If you have written a little
Ruby already, the first chapter will go quickly and chapters two and three are where the language stops looking like
anything else.

## What you will build

A command line tool for a small library. It reads a catalogue from JSON and the loans from CSV, searches and filters
the catalogue, records a loan, and prints a report of what is out and what is overdue.

Then it grows the parts a real tool needs: errors that name what went wrong, argument parsing with exit statuses, a
test suite with Minitest, a fake store so the tests never touch a file, a Rakefile, a Gemfile with a lock file, and
finally a gem build with an executable installed from it.

That program carries the whole course. Every chapter adds something to it rather than starting a throwaway example,
and the last page walks the finished tool from `northside list` to the exit status it leaves behind.

## Prerequisites

Ruby 3.2 or later and a terminal. The course was written against Ruby 3.4.7, which is the version the RubyInstaller
package installs on Windows, and Ruby 4.0 is the current line. Nothing here needs 4.0, and where a version changes
the answer the page says so.

You need to be comfortable running commands and reading their output. Every command block in this course is
something that was run, and the output under it came from that run.

On Windows, RubyInstaller puts the gems you install in your own user directory rather than in the Ruby installation,
so `gem install` needs no administrator and the executables land in a directory you may have to add to `PATH`. That
is covered in the second page rather than assumed.

## How the pages are ordered

The first chapter is the toolchain and the first script, because `irb` is where most Ruby is written and finding out
what an object responds to is the language's best debugging tool. The second and third cover the objects you use
every day: arrays, hashes, blocks, methods, classes, `Data`, modules and errors.

The fourth chapter is idioms rather than features: nil handling, equality, pattern matching, lazy enumeration and
text. These are the pages that change how your code looks. The fifth takes the program out of the process and into
files, JSON, CSV, environment variables, arguments and HTTP. The sixth is gems, project layout, Minitest, fakes,
Rake and warnings, which is how a folder of scripts turns into a project.

The last chapter is shipping: a gemspec, a built gem, the finished command line tool, and the two pages on how fast
and how concurrent Ruby can be when the question comes up.

Read them in order the first time, following the contents list on this page. Each lesson ends with something to run
or work out, and the later lessons assume the earlier code exists.
