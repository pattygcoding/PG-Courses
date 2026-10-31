---
title: Time and dates
summary: Time for moments, Date for days, and the monotonic clock for measuring anything.
chapter: Files and data
minutes: 14
status: draft
---

## Time and Date are different jobs

```irb
>> now = Time.now
=> 2026-10-31 10:25:46.8421515 -0400
>> now.class
=> Time
>> now.to_i
=> 1793456746
>> now.utc_offset
=> -14400
>> now.iso8601
=> "2026-10-31T10:25:46-04:00"
>> today = Date.today
=> #<Date: 2026-10-31 ((2461345j,0s,0n),+0s,2299161j)>
>> today.class
=> Date
```

`Time` is a moment: an instant with a timezone offset attached, which is why `to_i` can hand you seconds since the
epoch. `Date` is a day with no time and no zone, and it is the right type for anything a person writes on a calendar.

A due date is a day. A log line is a moment. Mixing the two is how a report tells you a book was due at midnight in
two different zones.

`Date#inspect` prints a Julian day number and an astronomical offset, which is useless in output. `to_s` and
`iso8601` are the readable forms:

```ruby
today.to_s            # "2026-10-31"
today.iso8601         # "2026-10-31"
today.strftime("%d/%m/%Y")
```

## Arithmetic

```irb
>> today + 14
=> #<Date: 2026-11-14 ...>
>> today.next_month
=> #<Date: 2026-11-30 ...>
>> (today - Date.new(2026, 10, 1)).to_i
=> 30
>> Date.new(2026, 11, 1) > Date.new(2026, 10, 31)
=> true
>> now + 3600
=> 2026-10-31 11:25:46.8421515 -0400
```

`Date#+` takes days and returns a `Date`, subtracting two dates gives a `Rational` that `.to_i` turns into a count of
days, and dates compare with the usual operators. `next_month` on the 31st of October returns the 30th of November,
because a `Date` is always a day that exists.

Adding seconds to a `Time` is exactly what it looks like. Adding a month to a `Time` is not, and the standard library
does not offer it, which is a hint: month arithmetic has more edge cases than it looks like, and the honest version
lives in a library that has thought about them.

The project's loans are the small case of this:

```ruby
def due_on
  borrowed_on + days
end

def overdue?(today = Date.today)
  due_on < today
end
```

Two lines, no timezone, and a test that pins the edge:

```ruby
refute loan.overdue?(Date.new(2026, 11, 7)), "due today is not overdue"
assert loan.overdue?(Date.new(2026, 11, 8))
```

That test is the definition of overdue written down. A loan due today is not overdue, and the date the check is run
on is a parameter so the test does not depend on the day it runs.

## Parsing, and refusing to guess

```irb
>> Date.iso8601("2026-10-31")
=> #<Date: 2026-10-31 ...>
>> Date.parse("31 October 2026")
=> #<Date: 2026-10-31 ...>
>> Date.iso8601("nope")
=> Date::Error
```

`Date.iso8601` accepts one format and rejects everything else. `Date.parse` is flexible and guesses, which is fine for
a note and wrong for a data file: `Date.parse("01/02/2026")` is the second of January to a European reader and the
first of February to an American one, and the library cannot tell you which it chose.

The rule is the one from the files chapter: the boundary knows the format, so it uses the strict parser. The project's
`parse_date` is two lines because of it:

```ruby
def self.parse_date(value)
  value.nil? || value.empty? ? Date.today : Date.iso8601(value)
end
```

## Formatting

```irb
>> now.strftime("%Y-%m-%d %H:%M")
=> "2026-10-31 10:25"
>> now.strftime("%A %d %B %Y")
=> "Saturday 31 October 2026"
>> today.strftime("%B %-d, %Y")
=> "October 31, 2026"
```

The directives worth knowing:

| Code | Gives | Example |
| --- | --- | --- |
| `%Y` `%m` `%d` | date | `2026-10-31` |
| `%H` `%M` `%S` | time | `10:25:46` |
| `%A` `%B` | names | `Saturday 31 October` |
| `%-d` | day, no padding | `31`, `3` |
| `%z` `%Z` | offset and zone | `-0400`, `Eastern Standard Time` |

For anything that has to be read by a machine, `iso8601` is the method rather than a format string, and the CSV in
this project stores dates that way: sortable as text, unambiguous, and parseable by everything.

## Measuring elapsed time

```irb
>> Process.clock_gettime(Process::CLOCK_MONOTONIC).round(1)
=> 10372.8
>> sleep 0.05
=> 0
>> Process.clock_gettime(Process::CLOCK_MONOTONIC).round(2)
=> 10372.88
>> Benchmark.realtime { sleep 0.02 }.round(2)
=> 0.03
```

The monotonic clock counts seconds since an arbitrary point and never jumps, so subtracting two readings gives the
time that actually passed. `Time.now` can jump backwards when the system clock is corrected, which is why a duration
measured with it can come out negative.

`Benchmark.realtime` is the same measurement with a nicer call. `Benchmark.measure` adds the CPU split:

```text
  0.188000   0.000000   0.188000 (  0.192332)
```

User time, system time, total, then real time in brackets. The project's concurrency page uses that form, and the gap
between the third number and the fourth is the whole story of what a thread did and did not buy.

## Timezones, briefly

The standard library's `Time#zone` reports the offset the operating system has configured:

```irb
>> Time.at(now.to_i).zone
=> "Eastern Standard Time"
>> Time.utc(2026, 10, 31, 12, 0, 0).iso8601
=> "2026-10-31T12:00:00Z"
```

Store moments in UTC and store days as days. On Windows, `ENV["TZ"]` is ignored, so a development machine reports the
system timezone and a test that depends on the local zone will pass there and fail in CI. Anything that needs named
zones needs a zone database, which is the `tzinfo` gem and, in Rails, Active Support's time zone helpers.

## Check yourself

Write a method that takes a list of loans and returns the ones overdue as of a given day, using `Date` arithmetic and
no loops over strings. Then add a second method that returns the number of days each is late, and check what it does
for a loan that is due today.
