---
title: Authorising actions
summary: Who may do this, which is a different question from who is signed in, and how much structure it needs.
chapter: Authentication and security
minutes: 13
status: draft
---

## Authentication is not authorisation

Authentication answers "who is this". Authorisation answers "may they do this". The generator gave the application the
first one:

```ruby
allow_unauthenticated_access only: %i[index show]
```

Everything else needs a session. That is the whole of the authorisation in this application, and for a system where
every signed-in user is a librarian, it is the right amount: one role, no policy, no gem.

The moment there are two kinds of user, this is the pattern people reach for:

```ruby
class Book < ApplicationRecord
  def editable_by?(user)
    user.present? && (user.admin? || user.id == created_by_id)
  end
end
```

```erb
<%= link_to "Edit", edit_book_path(@book) if @book.editable_by?(current_user) %>
```

## Hiding is not the check

That `if` in the view only hides a link. The action behind the link is still reachable by anyone who types the URL, so
the same question has to be asked in the controller:

```ruby
def edit
  @book = Book.find(params[:id])
  redirect_to @book, alert: "Not yours." unless @book.editable_by?(Current.user)
end
```

Worse, hiding the link and checking in the controller can drift apart. The version that cannot drift is to ask the same
question in one place and let the view call it:

```ruby
class BooksController < ApplicationController
  before_action :set_book
  before_action :authorise, only: %i[edit update destroy]

  private

  def set_book
    @book = Book.find(params[:id])
  end

  def authorise
    head :forbidden unless @book.editable_by?(Current.user)
  end
end
```

`head :forbidden` is a 403: the user is signed in and not allowed, which is a different answer from a 404 and a
different answer from a redirect to the sign-in page.

| Status | Means |
| --- | --- |
| 401 | not signed in |
| 403 | signed in and not allowed |
| 404 | not found, or deliberately not telling |
| 302 to sign in | not signed in, and this route wants a session |

The third row is worth a comment in an application where one user should not learn that another user's record exists:
`Book.find_by(id:, account_id: current_account.id)` raises `RecordNotFound` and answers 404 for both cases.

## Scoping queries rather than checking afterwards

The safer habit is to build the query from the user's own data, so a record they cannot see is one the query never
returns:

```ruby
def index
  @books = Current.user.books            # rather than Book.all
end

def show
  @book = Current.user.books.find(params[:id])   # 404 for somebody else's book
end
```

Nothing has to remember to check, because there is nothing to check: the relation cannot reach another user's rows. This
is the single most useful authorisation technique in Rails, and it costs one method on the association.

## Where a gem starts to be worth it

The hand-written version above is fine for one or two roles. It stops being fine when the rules are a matrix:

| Situation | Reaches for |
| --- | --- |
| one role, everything or nothing | the generator's `allow_unauthenticated_access` |
| a method on the model, `editable_by?` | a plain method, as above |
| five rules across ten controllers | `Pundit`: one policy class per model, one method per action |
| complex abilities described in data | `CanCanCan`: abilities in one file, checks everywhere |
| roles in the schema | `rolify` or a `role` column, with either of the above |

Pundit's shape is worth describing, because it is the one most Rails applications end up at:

```ruby
class BookPolicy < ApplicationPolicy
  def update?
    user.admin? || record.created_by_id == user.id
  end

  def permitted_attributes
    user.admin? ? [ :title, :author, :genre, :copies ] : [ :copies ]
  end
end
```

```ruby
def update
  @book = Book.find(params[:id])
  authorize @book                  # raises NotAuthorizedError when the policy says no
  @book.update(book_params)
end
```

A policy class per model, a method per action, and the rules in one file that can be read in one sitting. The gem's
value is not the checks; it is that the checks have an obvious place to live, and a reader knows where to look.

## Mass assignment is an authorisation question too

```ruby
params.expect(book: [ :title, :author, :genre, :copies ])
```

The list of permitted attributes is a decision about what a user may change, which is the same kind of decision as the
policy above. A librarian who may edit a title and a member who may only reserve a copy need two different lists, and
having one `book_params` shared by both controllers is how a member ends up able to edit a title.

## Check yourself

Add a `role` column to `User` with `librarian` and `member`, make the desk readable only by a librarian, and write the
tests for both roles. Then move the rule into a method on `User` and decide whether it should be a policy class yet.
