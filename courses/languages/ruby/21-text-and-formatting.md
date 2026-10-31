---
title: Text and formatting
summary: Regular expressions where they pay, padding and format strings, and the character count that is not the byte count.
chapter: Idioms
minutes: 14
status: draft
---

## Regular expressions, in moderation

```irb
>> text = "Dune (1965) by Frank Herbert"
>> text =~ /\((\d{4})\)/
=> 5
>> $1
=> "1965"
>> text.match(/\((?<year>\d{4})\)/)[:year]
=> "1965"
>> text.scan(/\w+/)
=> ["Dune", "1965", "by", "Frank", "Herbert"]
```

`=~` returns the position of the match and sets `$1`, `$2` and so on. `match` returns a `MatchData` object, which
takes named captures and does not touch global variables. Prefer `match`:

```ruby
if (found = text.match(/\((?<year>\d{4})\)/))
  found[:year]
end
```

`scan` returns every match, and it is a clean way to turn text into a list.

Replacing:

```irb
>> "a1b2".gsub(/\d/) { |digit| (digit.to_i + 1).to_s }
=> "a2b3"
>> "a1b2".gsub(/\d/, "1" => "2", "2" => "3")
=> "a2b3"
>> "dune".sub("d", "D")
=> "Dune"
```

`gsub` replaces every match and `sub` replaces the first. The second argument can be a string, a block or a hash of
replacements, and the block form is the one to reach for when the replacement depends on what matched.

Three more that cover most text work:

```irb
>> "dune-edda".tr("-", " ")
=> "dune edda"
>> "Dune  Edda".squeeze(" ")
=> "Dune Edda"
>> "dune".sub("d", "D")
=> "Dune"
>> "Dune".start_with?("Du")
=> true
>> "Dune".casecmp?("dune")
=> true
```

`tr` is a character-by-character translation and faster than `gsub` for single characters. `squeeze` collapses runs.
`casecmp?` compares without regard to case, which is the honest way to compare two strings as text.

## Where not to use one

A regular expression for an email address is the classic mistake. The Rails course's authentication generator uses
`URI::MailTo::EMAIL_REGEXP`, which the standard library maintains and which is deliberately loose; a hand-written
pattern that tries to be exact rejects valid addresses and accepts nonsense.

The rule I follow: a regex for finding a shape you control (a year in brackets, a field in a log line), and a parser
or a small well-tested pattern for validating something the user typed. When a regex does belong, put it in a named
constant and give it a comment with two examples, because nobody can read one.

## Lining up output

```irb
>> "Dune".ljust(10, ".") + "|"
=> "Dune......|"
>> "Dune".rjust(10, ".") + "|"
=> "......Dune|"
>> "Dune".center(10, ".") + "|"
=> "...Dune...|"
>> format("%-10s|%5.2f", "Dune", 3.14159)
=> "Dune      | 3.14"
```

`ljust`, `rjust` and `center` pad to a width with a fill character. `format` does the same with a template, and it is
what the report in this project uses:

```ruby
format("  %-18s %d", genre, count)
```

`%-18s` is a string left-aligned in eighteen characters, `%d` is an integer. The full set is worth skimming once:
`%s`, `%d`, `%f`, `%.2f`, `%x`, `%05d`, `%-10s`. `%` is the shorthand for the same thing, `"%-10s|%5.2f" % [ "Dune", 3.14 ]`,
and it is harder to read at a glance.

## Characters and bytes

```text
café
4
5
[99, 97, 102, 195, 169]
caf
CAFÉ
UTF-8
```

The word is four characters and five bytes, because `é` takes two bytes in UTF-8. `length` counts characters and
`bytesize` counts bytes, so a column width computed with `bytesize` is wrong for any text with an accent in it, and a
byte limit in a database is not the same limit as a character limit.

This matters at every boundary where text has a size: a form field with a maximum length, a fixed-width report, a
database column. `String#encoding` tells you which encoding a string thinks it is in, and Ruby raises an
`Encoding::CompatibilityError` when you mix two that cannot be combined, which is better than writing mojibake to a
file.

## Splitting and joining

```irb
>> "dune,edda,poetry".split(",").map(&:capitalize).join(" / ")
=> "Dune / Edda / Poetry"
>> "line one\nline two\n".lines.map(&:chomp)
=> ["line one", "line two"]
>> "line one\nline two\n".each_line.to_a.size
=> 2
>> "dune"[0, 2]
=> "du"
>> "dune"[-2..]
=> "ne"
>> "Dune by Frank Herbert"[/by (.+)/, 1]
=> "Frank Herbert"
```

`lines` and `each_line` split on the newline and are how a file should be read line by line. `String#[]` takes a
position, a range or a regular expression with a capture group number, and the last form is a compact way to pull one
field out of a line.

## Check yourself

Write a method that takes a line from a CSV file in the form `title, author, year` and returns a hash, using `split`
for the fields and a regex for the year. Then pass it a line with an empty author and decide whether a missing field
should raise or be accepted as an empty string.
