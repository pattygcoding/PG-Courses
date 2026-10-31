---
title: The finished tool
summary: Every command, the design behind it, and the parts that were left out on purpose.
chapter: Shipping
minutes: 13
status: draft
---

## What it does

```bash
northside list
```

```text
Dune by Frank Herbert (Science Fiction)
A Brief History of Time by Stephen Hawking (Non Fiction)
The Left Hand of Darkness by Ursula K. Le Guin (Science Fiction)
The Poetic Edda by Anonymous (Poetry)
```

```bash
northside show dune
```

```text
Dune by Frank Herbert (Science Fiction)
  copies: 3
  available: true
```

```bash
northside find edda
```

```text
The Poetic Edda by Anonymous (Poetry)
```

```bash
northside genres
```

```text
non-fiction
poetry
science-fiction
```

Recording a loan writes to the CSV and reports what is left:

```bash
northside lend the-poetic-edda --member="Alan Turing" --days=7
```

```text
Lent The Poetic Edda to Alan Turing, due 2026-11-07 (3 left)
```

```bash
northside lend dune --member="Alan Turing" --days=7
```

```text
Lent Dune to Alan Turing, due 2026-11-07 (2 left)
```

And the report:

```bash
northside report
```

```text
Northside Library, 2026-10-31
Books: 4, on loan: 2

By genre:
  science-fiction    2
  non-fiction        1
  poetry             1

Overdue:
  Ada Lovelace owes The Left Hand of Darkness
```

That output is the reason the report class exists rather than the CLI writing `puts` calls: the layout, the sorting
and the column widths are one method with a test, and the command line is a thin layer over it.

## What it does when something is wrong

```bash
northside find heidegger
```

```text
No book with id "heidegger" is in the catalogue
```

```bash
northside borrow dune
```

```text
Unknown command "borrow"
northside <command> [options]

Commands:
  list                  every book in the catalogue
  find <text>           books whose title contains the text
  show <id>             one book
  lend <id> --member=X  record a loan
  report                what is on loan and what is overdue
  genres                the genres in the catalogue
```

The exit status is the part a script uses:

| Command | Status |
| --- | --- |
| `northside list` | 0 |
| `northside find heidegger` | 1 |
| `northside borrow dune` | 64 |
| `northside lend dune --days=lots` | 64 |

Both messages go to standard error, so `northside genres > genres.txt` writes a clean file and leaves the complaint on
the terminal. The tests pin both halves:

```ruby
def test_an_unknown_command_explains_itself
  run_cli("borrow", "dune")

  assert_equal 64, @status
  assert_match(/Unknown command "borrow"/, @err.string)
  assert_match(/northside <command>/, @err.string)
end
```

## The shape of the program

```text
bin/northside          reads ENV, builds a store, hands over to the CLI
lib/northside/cli.rb   parses argv, dispatches, turns errors into statuses
lib/northside/*.rb     the objects: Book, Catalogue, Loan, Report, Store
test/*.rb              one file per class, plus a fake store for the CLI
```

The boundary is `bin/northside`:

```ruby
directory = ENV.fetch("NORTHSIDE_DATA", File.expand_path("../data", __dir__))
store = Northside::Store.new(directory)

exit Northside::CLI.new(store: store).run(ARGV)
```

Three lines of wiring. Everything above the store is a pure object graph, which is what the tests exercise, and the
one thing the tests do not touch is the line that reads the environment.

The CLI's own boundary is the same idea one level down: `run(argv)` takes the arguments, returns a status, and the
only thing it writes is through `@out` and `@err`. That is what makes a test able to call it six times in a second.

## The decisions worth defending

**A command word and a `case`.** Six commands, one dispatcher, no plugin registry. A registry would be the right
answer at thirty commands and the wrong one here.

**Positional arguments for the subject, options for everything else.** `lend <id> --member=NAME` reads as a sentence
and it is what every command line tool does.

**Errors as classes.** `MissingBook` carries the id and `NotAvailable` carries the book, so the CLI prints a sentence
and a caller could react differently without parsing text.

**The report is a class.** Formatting in a method with a test beats formatting in a `puts` call with none.

**Loans are written, the catalogue is not.** Lending decrements the copies in memory to print the new count; the file
is the catalogue of what exists, and a loan file is the record of what is out. Making the tool rewrite the catalogue
file would need a lock and a backup, which is the moment to reach for a database rather than a text file.

## What is not here, and why

**No `return` command.** Returning a loan needs a matching rule (which loan of that book, for that member) and the
file format has no loan id. Adding one is a change to the data model, not to the CLI, and the course stops before it.

**No concurrency.** Two people lending at the same time means two writers to one CSV file. The honest answer is a
lock file for one librarian or a database for two, and the next pages measure what threads would and would not buy.

**No output formats beyond text.** `--format=json` is an hour of work and it turns the report into an interface other
programs parse. That is a decision to make deliberately rather than a feature to add because it is easy.

**No configuration file.** `NORTHSIDE_DATA` and the defaults cover it. A settings file needs a format, a location
per platform and a merge order with the environment, which is real work for a tool with two settings.

## Check yourself

Add a `return` command that takes a book id and a member name, marks the matching open loan as returned, and puts the
copy back. Write the test first, with the fake store, and decide what status to return when there is no open loan to
match.
