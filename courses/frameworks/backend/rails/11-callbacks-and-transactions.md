---
title: Callbacks and transactions
summary: before_validation, the callback that takes a copy off the shelf, and why a raise rolls a save back.
chapter: Models and the database
minutes: 14
status: draft
---

## The callback list

| Callback | Runs |
| --- | --- |
| `before_validation` | before validations, and before `save` decides |
| `after_validation` | after validations, before the write |
| `before_save` | before the write |
| `before_create` / `before_update` | before the insert or the update |
| `after_create` / `after_update` | after it |
| `after_save` | after either |
| `after_commit` | after the transaction has committed |
| `after_rollback` | after it was rolled back |

This application uses three of them, each for a different kind of work:

```ruby
class Loan < ApplicationRecord
  attribute :borrowed_on, :date, default: -> { Date.current }
  attribute :days, :integer, default: DEFAULT_DAYS

  validates :days, numericality: { only_integer: true, in: 1..MAX_DAYS }

  before_validation :set_due_on
  before_create :take_a_copy

  private

  def set_due_on
    self.due_on = borrowed_on + days if borrowed_on && days
  end

  def take_a_copy
    book.lend!
  end
end
```

`before_validation` because `due_on` is derived from two attributes that might be assigned in any order. `before_create`
because taking a copy off the shelf happens once, when the loan is written, and not again on every update.

## Callbacks run inside the transaction

Rails wraps a save in a transaction, and a `before_*` callback that raises rolls the whole thing back:

```ruby
def lend!
  raise Loan::NotAvailable, "No copies of #{title} are on the shelf" unless available?

  decrement!(:copies)
end
```

With no copies on the shelf, `book.lend!` raises inside `before_create`, the insert never happens, and the controller
turns the exception into a message. The test that pins both halves:

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

Three assertions: the error, the copy count, and the absence of the row. Without the transaction the row would exist
and the shelf would be wrong, which is the state a partial failure leaves behind.

## after_commit, for anything outside the database

```ruby
class Loan < ApplicationRecord
  after_create_commit :remind_the_member

  private

  def remind_the_member
    LoanReminderJob.perform_later(id)
  end
end
```

`after_create_commit` runs once the row is committed, which is the right moment to enqueue a job, send mail or call an
API. A `after_create` hook that enqueues a job is a race: the job can run in another process before the transaction
that created its argument has committed, and the worker finds nothing.

The same reasoning applies to sending mail and to publishing to a websocket. `after_commit` with a `:on` option narrows
it further:

```ruby
after_commit :publish, on: :create
after_commit :notify, on: :update, if: :saved_change_to_returned_on?
```

`saved_change_to_returned_on?` is one of the change-tracking methods from the previous page, and the `if:` guard is what
stops a notification on every unrelated update.

## Transactions of your own

```ruby
Loan.transaction do
  loan.save!
  book.decrement!(:copies)
end
```

Anything that has to be all-or-nothing goes in one. `save!` and `update!` raise on failure, which is what makes the
rollback happen; the version without the bang returns false and leaves the transaction to commit something half done.

Three things worth knowing about transactions in Rails:

- A transaction is per database connection. Two threads, two connections, two transactions.
- `after_commit` callbacks are not part of the transaction, so work there can fail on its own.
- A long transaction holds locks and grows the write-ahead log. Work that involves a network call does not belong in
  one, which is the job system's reason for existing.

## When not to use a callback

Callbacks are convenient and they are also the hardest thing to follow in a Rails application, because a method that
saves a record can trigger four other classes' worth of behaviour. Three signs it is time to move the work out:

- The callback needs to know who is signed in.
- The callback talks to something outside the database.
- Two callbacks on the same model start to depend on their order.

The alternative is a plain method or a service object that does the steps in the open:

```ruby
class BorrowBook
  def call(book:, member:, days: 7)
    Loan.transaction do
      loan = book.loans.create!(member: member, days: days)
      Reminder.schedule(loan)
      loan
    end
  end
end
```

That reads top to bottom, and the order of the steps is visible rather than implied by the callback list. The
application in this course keeps `take_a_copy` on the model because a loan without a copy off the shelf is not a loan,
and that is the test for whether a callback belongs: it is about the object's own invariants, not about what the
application does with it.

## Check yourself

Add a `returned_on` to `Loan` with a `return!` method that sets the date and puts the copy back in one transaction,
then a test proving that a failure inside it leaves both the loan and the book unchanged. Then decide whether the
notification for an overdue loan belongs in a callback or in a job.
