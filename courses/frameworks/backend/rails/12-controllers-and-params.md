---
title: Controllers and parameters
summary: One class per resource, params.expect, and the two lines that turn a failure into a page.
chapter: Controllers and views
minutes: 14
status: draft
---

## The controller

```ruby
class BooksController < ApplicationController
  # Anyone can browse the catalogue. Everything else needs a signed in
  # librarian, because the Authentication concern requires it by default.
  allow_unauthenticated_access only: %i[index show]

  def index
    @books = Book.search(params[:query]).by_genre(params[:genre]).order(:title)
    @genres = Book.distinct.order(:genre).pluck(:genre)
  end

  def show
    @book = Book.find(params[:id])
    @loan = @book.loans.new(member: Member.new)
    @waiting_entry = @book.waiting_entries.new
    @outstanding = @book.loans.outstanding.includes(:member)
  end
end
```

Four things happen in that code, and they are the shape of every action: a query built from `params`, a record found
by id, the objects a form needs built rather than saved, and an association loaded with `includes`.

The instance variables an action sets are the interface to the view. That is the whole contract between the two files.

## params

```ruby
params[:id]            # from the path
params[:query]         # from the query string, nil when absent
params[:loan][:days]   # from a form, nested under the model name
```

`params` merges path segments, query string and form body, with string keys, and it is
`ActionController::Parameters` rather than a `Hash`, which is what makes the next section possible. Everything in it
is a string, so a number is a conversion:

```ruby
days = Integer(params.fetch(:days, 14))
```

`Integer()` raises on `"nope"` where `to_i` would give zero, which is the boundary rule from the Ruby course.

## Strong parameters

```ruby
private
  def loan_params
    params.expect(loan: [ :book_id, :days, :member_name, :member_email ])
  end
```

`params.expect` is the Rails 8 form: it requires the `loan` key and keeps only the four named attributes. The older
form is still everywhere:

```ruby
params.require(:loan).permit(:book_id, :days, :member_name, :member_email)
```

`require(:loan)` raises `ActionController::ParameterMissing` when the key is absent, which the middleware turns into a
400 rather than a 500.

Why it matters: without filtering, a client can set any column it likes.

```ruby
@book.update(params[:book])   # copies, created_at, and whatever column is added next month
```

A form that shows a title field does not stop a request that posts three others. `params.expect(book: [ :title ])` is
the list of what the endpoint accepts, and it sits next to the action that uses it.

## Turning a failure into a page

```ruby
def create
  @book = Book.find(loan_params[:book_id])
  @loan = @book.loans.build(member: member_for(loan_params), days: loan_params[:days])

  if @loan.save
    redirect_to @book, notice: "Lent #{@book.title} to #{@loan.member.name}, due #{@loan.due_on}."
  else
    render_book_page
  end
rescue Loan::NotAvailable => error
  @loan.errors.add(:base, error.message)
  render_book_page
end
```

Three details worth copying. The success path redirects, so a refresh does not post the form twice. The failure path
renders the page the form was on, so the user keeps what they typed. And the rescue turns a rule into a message
instead of a 500 page.

`render_book_page` is a private method because two branches need the same four lines:

```ruby
private
  def member_for(attributes)
    Member.find_or_initialize_by(email: attributes[:member_email]).tap do |member|
      member.name = attributes[:member_name] if member.new_record?
    end
  end

  def render_book_page
    @waiting_entry = @book.waiting_entries.new
    @outstanding = @book.loans.outstanding.includes(:member)
    render "books/show", status: :unprocessable_entity
  end
```

## before_action

```ruby
class ApplicationController < ActionController::Base
  include Authentication
  allow_browser versions: :modern
  stale_when_importmap_changes
end
```

`include Authentication` puts `before_action :require_authentication` in front of every action in the application, and
`allow_unauthenticated_access` in a controller opts actions out. That is why the catalogue is public, the desk is not,
and neither controller mentions a cookie.

A `before_action` that loads the record an action needs is common enough to have a name: `set_book`. It is also the one
to be careful with, because a reader of the action cannot see where `@book` came from.

## Status codes an action chooses

```ruby
render "books/show", status: :unprocessable_entity   # 422
redirect_to @book, status: :see_other                # 303, after a POST
head :no_content                                     # 204, no body
```

`render` is 200 and `redirect_to` is 302, or 303 when the request was not a GET. The 422 on a re-rendered form is the
one to remember: it tells a test, a client and Turbo the difference between a page and a rejected submission.

## Check yourself

Add a `members#show` action that lists a member's current loans, using a scope and an `includes`. Then write the
`params.expect` line for creating a member and explain which columns a client must not be able to set.
