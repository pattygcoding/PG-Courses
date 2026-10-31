---
title: Model tests
summary: Rules, scopes and rollbacks, written as the questions a reader would ask.
chapter: Testing
minutes: 13
status: draft
---

## One test per question

```ruby
require "test_helper"

class BookTest < ActiveSupport::TestCase
  test "a book needs a title, an author and a known genre" do
    book = Book.new

    assert_not book.valid?
    assert_includes book.errors[:title], "can't be blank"
    assert_includes book.errors[:author], "can't be blank"
    assert_includes book.errors[:genre], "is not included in the list"
  end

  test "copies cannot go below zero" do
    book = books(:dune)
    book.copies = -1

    assert_not book.valid?
    assert_includes book.errors[:copies], "must be greater than or equal to 0"
  end

  test "a book with copies left is available" do
    assert books(:dune).available?
    assert_not books(:darkness).available?
  end
end
```

`test "..." do ... end` is minitest's Rails-flavoured form: the string is the test name and it becomes the method name.
Writing it as a sentence is worth the effort, because the name is all a failure report shows:

```text
  1) Failure:
BookTest#test_a_book_with_copies_left_is_available [test/models/book_test.rb:19]:
Expected false to be truthy.
```

## Assertions that say what happened

| Assertion | Reads |
| --- | --- |
| `assert book.valid?` | the rule accepts this |
| `assert_not book.valid?` | the rule rejects this |
| `assert_includes book.errors[:copies], "..."` | this message, exactly |
| `assert_equal 3, book.copies` | this value |
| `assert_operator short, :<, long` | this relationship |
| `assert_nil Loan.find_by(...)` | nothing was written |

`assert_includes` on one error message is safer than `assert_equal` on the whole list: the order is not a
contract, and a new validation should not break an unrelated test.

## Testing a scope as a query

```ruby
test "search matches titles and authors" do
  assert_equal [ books(:edda) ], Book.search("edda").to_a
  assert_equal [ books(:dune) ], Book.search("herbert").to_a
  assert_equal Book.count, Book.search("").count
  assert_equal Book.count, Book.search(nil).count
end

test "search treats a wildcard as a character" do
  assert_empty Book.search("%")
end
```

The second test earned its place: `%` in a `LIKE` pattern matches everything, so a search box that passes it through
unescaped returns the whole catalogue. That test is the specification for `sanitize_sql_like`.

Comparing relations with `assert_equal` does not work; use `to_a`, or compare counts. A relation and the array of the
same rows are not equal.

## Testing what a save does to a second record

```ruby
test "saving a loan takes a copy off the shelf" do
  book = books(:dune)

  assert_difference -> { book.reload.copies }, -1 do
    Loan.create!(book: book, member: members(:grace), days: 7)
  end
end

test "returning a loan puts the copy back" do
  book = books(:dune)
  loan = loans(:current_dune)

  assert_difference -> { book.reload.copies }, 1 do
    loan.return!
  end

  assert loan.reload.returned_on.present?
  assert_not loan.outstanding?
end
```

`assert_difference` takes a lambda returning a number and an amount, and asserts it changed by that much. `book.reload`
matters: without it the assertion reads the in-memory copy, which does not know what the other object wrote. A missing
`reload` is the most common reason an `assert_difference` passes when it should fail.

## Testing a rollback

```ruby
test "a loan of a book with nothing on the shelf is refused and rolled back" do
  error = assert_raises(Loan::NotAvailable) do
    Loan.create!(book: books(:darkness), member: members(:grace), days: 7)
  end

  assert_equal "No copies of The Left Hand of Darkness are on the shelf", error.message
  assert_equal 0, books(:darkness).reload.copies
  assert_nil Loan.find_by(book: books(:darkness), member: members(:grace))
end
```

Three assertions for one rule, each a different half of the promise: the error names the problem, the shelf did not move,
and no row was written. A test that only asserts the raise would pass with a half-written loan left behind, which is the
state a missing transaction produces.

`assert_raises` returns the exception, which is how the message gets checked. The class matters more than the message: a
message can be reworded, and the class is what a caller rescues by.

## One detail about callbacks

```ruby
test "the due date is filled in when the loan is validated" do
  loan = Loan.new(book: books(:dune), member: members(:ada), days: 7, borrowed_on: Date.new(2026, 10, 1))

  assert loan.valid?
  assert_equal Date.new(2026, 10, 8), loan.due_on
end
```

The first version of that test asserted on `due_on` straight after `Loan.new` and failed, because the callback runs at
validation time rather than at construction. Asserting on the value rather than on the callback is right; knowing that a
`before_validation` callback has not run yet is the useful part.

## Where a model test ends

A model test is about the model: validation, scope, association, callback, and a method that answers a question about its
own data. When the question involves a request or a response, it belongs in a controller or integration test.

The judgement worth developing is what *not* to test: the `belongs_to` Rails wrote, a getter with no logic, the
framework's own `find`. A suite's value is in the cases that would otherwise go wrong.

## Check yourself

Write the tests for a `Member` needing a name of three characters, a unique email address and an optional ten-digit phone
number. For each rule, include one valid and one invalid case, and use `assert_includes` rather than `assert_equal` on
the error list.
