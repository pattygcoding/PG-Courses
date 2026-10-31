---
title: System tests
summary: A real browser, what it catches that integration tests cannot, and why this application has none.
chapter: Testing
minutes: 13
status: draft
---

## What this application does not have

There is no `test/system` directory and no `test/application_system_test_case.rb`, because `rails new` in Rails 8.1 does
not write them: the browser test setup is added when a project asks for it.

```bash
bundle exec rails generate system_test books
```

```text
      create  test/application_system_test_case.rb
      create  test/system/books_test.rb
```

The gems are already in the Gemfile, in the test group:

```ruby
group :test do
  gem "capybara"
  gem "selenium-webdriver"
end
```

Capybara is the API a test is written in and Selenium is one of the drivers underneath it.

## The base class

```ruby
require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ]
end
```

`driven_by` chooses the browser. The options that matter:

| Driver | Runs JavaScript | Speed |
| --- | --- | --- |
| `:rack_test` | no | fastest |
| `:selenium, using: :headless_chrome` | yes | slow, needs Chrome |
| `:selenium, using: :headless_firefox` | yes | slow, needs Firefox |
| `:cuprite` | yes | fast, needs Chrome, a gem away |

`:rack_test` is Capybara's own driver and it never leaves Ruby. It is faster than the others and it is the right choice
for a test that is really about a multi-step flow rather than about JavaScript:

```ruby
class BorrowingSystemTest < ApplicationSystemTestCase
  driven_by :rack_test

  test "a librarian records a loan" do
    visit new_session_url
    fill_in "Enter your email address", with: "librarian@northside.test"
    fill_in "Enter your password", with: "password"
    click_on "Sign in"

    visit book_url(books(:dune))
    fill_in "Member name", with: "Ada Lovelace"
    fill_in "Member email", with: "ada@example.com"
    click_on "Record loan"

    assert_text "Lent Dune to Ada Lovelace"
  end
end
```

That test is the same flow the integration test covers, written in the vocabulary of a person using the page. Its value
over the integration test is that it proves the labels, the buttons and the form still line up: `fill_in "Member name"`
fails if the label is renamed, and an integration test that posts a params hash would not notice.

## What only a browser can test

The Turbo behaviour in this course was checked by hand in a browser, and the evidence was a console error:

```text
The response (200) did not contain the expected <turbo-frame id="catalogue"> and will be ignored.
To perform a full page visit instead, set turbo-visit-control to reload.
```

No integration test can produce that line, because the failure is in the JavaScript rather than in the response. A
system test with a real driver can:

```ruby
driven_by :selenium, using: :headless_chrome

test "the catalogue filters without a page load" do
  visit books_url
  fill_in "Search the catalogue", with: "edda"
  click_on "Filter"

  assert_selector "li.book", count: 1
  assert_text "The Poetic Edda"
end
```

With `:rack_test` that test would fail or pass for the wrong reason, because the form would submit as a normal
navigation and the page would reload.

The list of things only a browser can answer:

| Behaviour | Needs |
| --- | --- |
| a Turbo Frame navigating in place | a real driver |
| a Turbo Stream applying an instruction | a real driver |
| a Stimulus controller | a real driver |
| a form's client-side validation blocking a submit | a real driver |
| a page's links and labels matching the controller | `:rack_test` |
| a multi-step flow with redirects | `:rack_test` |

## The honest costs

```bash
bundle exec rails test:system
```

A system test starts a server, starts a browser and drives it. On this machine that means a Chrome binary that has to
exist, a server port that has to be free, and a test that takes seconds rather than milliseconds. Three consequences:

- The suite in this application is 61 tests in under a second. A handful of system tests would multiply that.
- A machine without the browser binary fails the suite with an error that has nothing to do with the application, which
  is why the browser setup is opt-in rather than generated.
- The failures are the hardest to read, because the failure is a timeout waiting for an element. Rails saves a
  screenshot and the page's HTML on a failure, which is what turns "it timed out" into "the button said Record loan and
  the test looked for Record" .

The generated CI file leaves system tests commented out for exactly these reasons:

```ruby
  # Optional: Run system tests
  # step "Tests: System", "bin/rails test:system"
```

Turning that on is a decision about the CI machine, not about the application.

## Check yourself

Generate the system test setup, point the email error test at it, and confirm the browser's own validation blocks the
submit before Rails sees it. Then write one system test with a real driver for the waiting list and decide whether the
cost is worth keeping in the suite.
