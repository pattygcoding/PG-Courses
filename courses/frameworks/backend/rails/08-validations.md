---
title: Validations
summary: Rules on the model, the errors they produce, and the one rule a database constraint caught first.
chapter: Models and the database
minutes: 15
status: draft
---

## Rules on the model

```ruby
class Book < ApplicationRecord
  GENRES = %w[science-fiction non-fiction poetry].freeze

  validates :title, :author, presence: true
  validates :copies, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :genre, inclusion: { in: GENRES }
end
```

Three validations, no configuration, and each reads as a sentence. They run on `save`, `update` and `create` unless
they are restricted, and a failure makes `save` return false rather than raising:

```ruby
book = Book.new
book.save        # false
book.errors.any? # true
```

## The errors object

```ruby
book = Book.new
book.valid?
book.errors[:title]        # ["can't be blank"]
book.errors[:genre]        # ["is not included in the list"]
book.errors.full_messages  # ["Title can't be blank", "Author can't be blank", ...]
```

`errors[:title]` gives the messages for one attribute and `full_messages` gives sentences with the attribute's name in
front, which is what a form prints.

The tests for these are short, and they pin the wording per attribute:

```ruby
test "a book needs a title, an author and a known genre" do
  book = Book.new

  assert_not book.valid?
  assert_includes book.errors[:title], "can't be blank"
  assert_includes book.errors[:author], "can't be blank"
  assert_includes book.errors[:genre], "is not included in the list"
end
```

`assert_includes` rather than `assert_equal` on the whole list, because the order of that list is not a contract.

## The validators worth knowing

| Validator | Checks |
| --- | --- |
| `presence: true` | not nil and not an empty string |
| `length: { minimum: 3, maximum: 20 }` | string length |
| `numericality: { only_integer: true, in: 1..28 }` | a number, optionally in a range |
| `inclusion: { in: LIST }` | membership, reported as "is not included in the list" |
| `exclusion: { in: LIST }` | the reverse |
| `format: { with: /regex/ }` | a pattern |
| `uniqueness: true` | no other row holds the same value |
| `comparison: { greater_than: :other_field }` | two fields against each other |
| `validates_associated :member` | the associated record is valid too |

All of them take `allow_nil: true`, `allow_blank: true`, `on: :create` and `message:`. Two matter often: `allow_blank`
on a format rule for an optional field, and a custom message where the default does not explain the rule.

```ruby
validates :email, presence: true, uniqueness: true,
  format: { with: URI::MailTo::EMAIL_REGEXP, message: "is not an email address" }
```

`URI::MailTo::EMAIL_REGEXP` is the standard library's own pattern. It is deliberately loose, and that is right: a
stricter pattern rejects valid addresses, and the only way to know an address works is to send mail to it.

## Uniqueness is a check, not a guarantee

```ruby
validates :email, uniqueness: true
```

That runs a `SELECT` before the `INSERT`, so two requests arriving at the same moment both see no row and both write
one. The validation is the friendly message; the guarantee is an index:

```ruby
t.string :email, index: { unique: true }
```

Both, always. When the index does reject an insert the exception is `ActiveRecord::RecordNotUnique`, which is worth
rescuing at the boundary where it can happen.


## The bug a database constraint caught

`Loan` belongs to two things and has a rule about the member:

```ruby
class Loan < ApplicationRecord
  belongs_to :book
  belongs_to :member

  validates :days, numericality: { only_integer: true, in: 1..28 }
  validates :borrowed_on, presence: true
  # Without this the loan would be inserted before the member it points at is
  # known to be valid, and the database refuses the row with a nil member_id.
  validates_associated :member
end
```

Without that last line, recording a loan with a bad email address crashed the request:

```text
ActiveRecord::NotNullViolation: SQLite3::ConstraintException: NOT NULL constraint failed: loans.member_id
```

The member was invalid, so `belongs_to` did not save it, and the loan was written with a nil `member_id` anyway. The
database refused the row, which is the constraint doing its job, and the application answered with a 500 page instead
of a form with a message on it.

Two things come out of that. `belongs_to` validates the association on save but not on `valid?`, so a controller that
checks `model.valid?` before saving can still reach the database with a broken row. And the error names the column
rather than the association, so the fix is a validation and not a rescue.

## Displaying the errors

```erb
<%= render "shared/errors", records: [ @loan, @loan.member ] if @loan.errors.any? || @loan.member.errors.any? %>
```

```erb
<div class="errors" role="alert">
  <h3>That could not be recorded</h3>
  <ul>
    <% records.flat_map { |record| record.errors.full_messages }.each do |message| %>
      <li><%= message %></li>
    <% end %>
  </ul>
</div>
```

Two records can be invalid at once, which is why the partial takes a list. `error_messages_for` was the Rails helper
for this and is a gem now; a partial of six lines is the current answer.

An error that belongs to the record rather than to a field goes on `:base`:

```ruby
@loan.errors.add(:base, "No copies of The Left Hand of Darkness are on the shelf")
```

`full_messages` shows that with no attribute name in front, and it is the right place for a rule about the whole
record. "No copies on the shelf" is a fact about the loan, not about one of its columns.

## The browser validates first

```erb
<%= form.email_field :member_email, required: true %>
```

An `<input type="email">` refuses to submit `ada at example` at all. The request never leaves the browser, so the
Rails validation never runs, and the user gets a tooltip rather than a message in the page. That is a good default and
worth knowing about, because a test that posts the invalid value directly exercises a path a person clicking the
button cannot reach. `novalidate` on the form turns the browser off when the server's messages should be the only
ones.

## Check yourself

Write the validations for a `Member` that needs a name of at least three characters, a unique email address and an
optional phone number of ten digits. Test each rule with one assertion, and add the database constraints each one
needs in order to be a guarantee rather than a check.
