---
title: Controller and integration tests
summary: Requests, responses, assert_select, and the helper that signs a librarian in without a password.
chapter: Testing
minutes: 14
status: draft
---

## A request and a response

```ruby
require "test_helper"

class BooksControllerTest < ActionDispatch::IntegrationTest
  test "the catalogue lists every book, and anybody can read it" do
    get books_url

    assert_response :success
    assert_select "li.book", count: Book.count
    assert_select "li.book a", text: "Dune"
  end

  test "an empty result says so" do
    get books_url(query: "heidegger")

    assert_select ".empty", text: "No book matches that search."
    assert_select "li.book", count: 0
  end
end
```

`get books_url` sends a real request through the whole stack, including routing and middleware, and `assert_select` reads
the HTML that came back. A controller test is the closest thing to a browser that does not need one.

`books_url` rather than `books_path`: the `_url` helper is absolute, which is what an integration test wants. In a view,
`_path` is the one to use.

## assert_select

```ruby
assert_select "li.book", count: 4
assert_select "li.book a", text: "Dune"
assert_select ".errors", /Days must be in 1\.\.28/
assert_select "#waiting-count", /1 borrower waiting/
assert_select "turbo-frame#catalogue" do
  assert_select "form.filters"
  assert_select "ul.books"
end
```

The selector is CSS, `count`, `text` and `minimum` narrow it, and a block nests further selectors. The block form is what
makes a structural claim readable: there is a frame called catalogue, and inside it a filters form.

A failure prints how many matches it found, which is usually enough to see what happened. It is not a full HTML parser
and it does not run JavaScript, so it tests the response rather than the page.

## Signing in

```ruby
test "the desk asks a visitor to sign in" do
  get loans_url

  assert_redirected_to new_session_url
end

test "the desk shows the overdue loans to a librarian" do
  sign_in_as users(:librarian)

  get loans_url

  assert_response :success
  assert_select "h2", text: "Overdue"
  assert_select "td", text: "Ada Lovelace"
end
```

`sign_in_as` is the helper the authentication generator wrote, loaded into every integration test by `test_helper.rb`.
It creates a session row and sets the signed cookie, so no password is involved and the test does not depend on the
sign-in form working.

That pair is the shape to copy for every authenticated resource: one test that turns a visitor away and one that shows
the action working for somebody allowed.

## A flow across requests

```ruby
class BorrowingTest < ActionDispatch::IntegrationTest
  setup do
    @book = books(:dune)
    @librarian = users(:librarian)
    @loan = { book_id: books(:dune).id, member_name: "Alan Turing", member_email: "alan@example.com", days: 7 }
  end

  test "a librarian records a loan and the copy comes off the shelf" do
    sign_in_as @librarian

    assert_difference "Loan.count", 1 do
      assert_difference -> { @book.reload.copies }, -1 do
        post loans_url, params: { loan: @loan }
      end
    end

    assert_redirected_to book_url(@book)
    follow_redirect!
    assert_select "#flash .notice", /Lent Dune to Alan Turing/
  end
end
```

Four patterns live in that one test:

- `assert_difference "Loan.count", 1` takes a string that is evaluated, so a count and a method call both work.
- The nested lambda version checks the copy count at the same time, which is the point: two records changed together.
- `assert_redirected_to` checks the Post/Redirect/Get shape rather than only the status.
- `follow_redirect!` asks for the page the user now sees, which is the only way to check the flash, and
  `assert_select "#flash .notice", /.../` checks it where the layout puts it.

Testing the redirect *and* the page it lands on is what makes the test a description of what a person experiences rather
than of what the controller returned.

## The failure paths

```ruby
test "a loan with an impossible length comes back as an error" do
  sign_in_as @librarian

  assert_no_difference "Loan.count" do
    post loans_url, params: { loan: @loan.merge(days: 90) }
  end

  assert_response :unprocessable_entity
  assert_select ".errors", /Days must be in 1\.\.28/
  assert_select "h1", text: "Dune"
end

test "a book with no copies cannot be lent" do
  sign_in_as @librarian

  assert_no_difference "Loan.count" do
    post loans_url, params: { loan: @loan.merge(book_id: books(:darkness).id) }
  end

  assert_response :unprocessable_entity
  assert_select ".errors", /No copies of The Left Hand of Darkness are on the shelf/
  assert_equal 0, books(:darkness).reload.copies
end
```

`assert_no_difference` is the assertion for a write that must not happen, and it reads better than counting rows by hand.
The 422 is what pins the decision from the flash page: a rejected form re-renders with that status rather than
redirecting. The second test also checks the shelf did not move, which guards against a callback that decremented before
the validation failed.

## What these tests do not cover

No JavaScript runs, so a Turbo Frame navigation, a Stimulus controller and a list that updates itself are all invisible
here. `assert_select` reads the HTML the server sent and cannot tell you what the browser did with it. That is the next
page's reason for existing.

## Check yourself

Write the tests for `members#show`: one for a visitor, one for a signed-in librarian, one for a member with no loans, and
one checking that two outstanding loans appear in due-date order. Then add a test for a member id that does not exist and
decide which status it should return.
