---
title: JSON, CSV and YAML
summary: Three formats in the standard library, three sets of types they cannot carry, and a conversion at each boundary.
chapter: Files and data
minutes: 14
status: draft
---

## JSON

```irb
>> book = Dune.new(id: "dune", title: "Dune", copies: 3)
>> JSON.generate(book.to_h)
=> "{\"id\":\"dune\",\"title\":\"Dune\",\"copies\":3}"
>> JSON.parse(json)
=> {"id" => "dune", "title" => "Dune", "copies" => 3}
>> JSON.parse(json, symbolize_names: true)
=> {id: "dune", title: "Dune", copies: 3}
>> JSON.parse("not json")
=> JSON::ParserError
```

`JSON.generate` takes hashes, arrays, strings, numbers, booleans and nil. Anything else has to be turned into one of
those first, which is why `Book#to_h` exists, and why the class writes its own `to_h` rather than relying on `Data`'s
symbol keys: the file format uses strings.

`symbolize_names: true` is worth knowing and worth being careful with: a symbol built from a string that came off the
network is retained for the life of the process, which is the leak the symbols page warned about. For a file your own
program wrote, it is fine.

`JSON.pretty_generate` writes the indented form, which a person can read in a diff. The cost is size, so write
compact JSON to a machine and pretty JSON to a repository:

```ruby
File.write(catalogue_path, JSON.pretty_generate(books.map(&:to_h)))
```

Reading it back is the other half of the class:

```ruby
def self.from_json(text)
  new(JSON.parse(text).map { |entry| Book.from_h(entry) })
end
```

`JSON.parse` gives hashes with string keys, `Book.from_h` fetches each field by name, and a missing field raises
`KeyError` naming it. The alternative, using `hash["copies"] || 1` everywhere, turns a broken file into a plausible
one.

## CSV

```irb
>> rows = CSV.parse("id,title\ndune,Dune\n", headers: true)
=> #<CSV::Table mode:col_or_row row_count:2>
>> rows.first
=> #<CSV::Row "id":"dune" "title":"Dune">
>> rows.first["title"]
=> "Dune"
>> rows.map(&:to_h)
=> [{"id" => "dune", "title" => "Dune"}]
>> CSV.generate { |csv| csv << %w[id title]; csv << %w[dune Dune] }
=> "id,title\ndune,Dune\n"
```

`headers: true` makes the first line the key for each row, and every value arrives as a string. A CSV file has no
types, so `days` comes back as `"7"` and it is the boundary's job to convert it:

```ruby
def self.from_h(hash)
  new(days: Integer(hash.fetch("days", 14)), borrowed_on: parse_date(hash["borrowed_on"]))
end
```

Writing is the mirror image, and `CSV.open` with a block closes the file:

```ruby
def write_loans(loans)
  CSV.open(loans_path, "w", write_headers: true, headers: %w[book_id member days borrowed_on]) do |csv|
    loans.each { |loan| csv << [ loan.book_id, loan.member, loan.days, loan.borrowed_on.iso8601 ] }
  end
end
```

Two traps that cost real time. A quoted field containing a comma or a newline is handled for you, which is the reason
to use the library rather than `split(",")`. And a file written by a spreadsheet often has a byte order mark, which
is why every read in this project uses `encoding: "bom|utf-8"`:

```ruby
CSV.read(loans_path, headers: true, encoding: "bom|utf-8")
```

## YAML

```irb
>> yaml = YAML.dump({ "books" => [ { "id" => "dune" } ] })
=> "---\nbooks:\n- id: dune\n"
>> YAML.safe_load(yaml)
=> {"books" => [{"id" => "dune"}]}
>> YAML.safe_load("--- !ruby/object:Object {}")
=> Psych::DisallowedClass
```

YAML is the format the frontmatter of every lesson in this catalogue is written in, and it is the right one for a file
a person edits: comments, multi-line strings and no commas to get wrong.

`safe_load` refuses to build arbitrary Ruby objects, and `load` does not. A YAML file from an untrusted source passed
to `YAML.load` can construct objects in your process, which is a remote code execution hole; `safe_load` was the fix
and the older code that calls `load` is the finding. When your own classes have to be permitted:

```ruby
YAML.safe_load(text, permitted_classes: [ Date ], aliases: true)
```

## One conversion per boundary

The pattern in all three is the same, and it is worth stating plainly:

- Outside the program: strings, numbers and lists, in a file.
- Inside the program: objects with names and methods.
- The conversion happens in one place: `from_json`, `from_h`, `to_h`.

Everything else in the project deals in `Book` and `Loan`, so a change to the file format touches two methods rather
than every line that reads a field. The test suite checks the round trip in both directions, which is what makes the
boundary safe to change.

## Check yourself

Write a `Store` method that writes the whole catalogue back to JSON, then a test that writes a catalogue, reads it,
and asserts the two are equal. Then break the file deliberately by removing a field and check that the failure names
the field rather than returning a book with a nil title.
