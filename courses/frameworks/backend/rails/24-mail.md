---
title: Mail
summary: A mailer, a view for each format, a preview to look at, and why it goes through a job.
chapter: The rest of the stack
minutes: 13
status: draft
---

## The mailer the authentication generator wrote

```ruby
class PasswordsMailer < ApplicationMailer
  def reset(user)
    @user = user
    mail subject: "Reset your password", to: user.email_address
  end
end
```

A mailer is a controller with views. The method sets the instance variables the view needs and calls `mail` with the
headers, and Rails looks for a template named after the method:

```text
app/views/passwords_mailer/reset.html.erb
app/views/passwords_mailer/reset.text.erb
```

Both files exist because the generator wrote both, and that is the pattern worth copying: a text version is what a
plain client and a spam filter see, and an application that only sends HTML is one where the plain-text part is a
guess.

```erb
<%# app/views/passwords_mailer/reset.html.erb %>
<p>
  <%= link_to "Reset your password", edit_password_url(@user.password_reset_token) %>
</p>
```

```erb
<%# app/views/passwords_mailer/reset.text.erb %>
Reset your password: <%= edit_password_url(@user.password_reset_token) %>
```

Notice `edit_password_url` rather than `_path`: mail is read outside the application, so the link has to be absolute,
and Rails needs to know the host. That is `config.action_mailer.default_url_options`:

```ruby
# config/environments/production.rb
config.action_mailer.default_url_options = { host: "library.example.com", protocol: "https" }
```

A missing or wrong host here is the most common mail bug, and it shows up as a link to `http://localhost:3000` in a
message sent to a real person.

## Sending

```ruby
PasswordsMailer.reset(user).deliver_later
PasswordsMailer.reset(user).deliver_now
PasswordsMailer.reset(user)              # the message object, unsent
```

`deliver_later` enqueues the message as a job. That is the form to use in a request, for two reasons: SMTP is slow
enough to notice, and a mail server that is down should not turn into a failed request for the user.

`deliver_now` is for a test or a console. The unsent form is how a test asserts on the message without sending it. The
application's generated mailer sends in one line:

```ruby
passwords_mailer.reset(user).deliver_later
```

## Delivering in development

```ruby
# config/environments/development.rb
config.action_mailer.delivery_method = :letter_opener
# or, without a gem
config.action_mailer.delivery_method = :file
config.action_mailer.file_settings = { location: "tmp/mails" }
```

The default in development is to keep the messages in memory, so nothing is sent and nothing is shown. The two options
above are the useful ones: `:file` writes each message to a file under `tmp/`, and `letter_opener` opens it in a
browser tab. Both keep real mail out of a real inbox while you work.

In test the default is `:test`, which collects the messages the way the test queue collects jobs:

```ruby
test "a reset mail is sent" do
  assert_emails 1 do
    PasswordsMailer.reset(users(:librarian)).deliver_now
  end

  assert_enqueued_email_with PasswordsMailer, :reset, args: [ users(:librarian) ] do
    PasswordsMailer.reset(users(:librarian)).deliver_later
  end
end
```

`assert_emails` counts what was sent and `assert_enqueued_email_with` checks what was queued, which is the same pair of
questions as the job tests: did the application decide to send, and did the send work.

## Previews

```ruby
class PasswordsMailerPreview < ActionMailer::Preview
  def reset
    PasswordsMailer.reset(User.first)
  end
end
```

A preview renders the mailer at `/rails/mailers/passwords_mailer/reset` in development, which is the only practical way
to work on the layout of a message. The generator writes one preview per mailer, and it is worth keeping them up to
date: a mail template that has not been looked at in a browser is one where a broken link will be found by a user.

## What a mailer should not do

| Temptation | Better |
| --- | --- |
| build the message body in the mailer method | put it in the view |
| send from a model callback with `deliver_now` | `after_commit` and `deliver_later` |
| look up the recipient inside the view | pass it in and set it in the mailer |
| attach a file generated in the request | generate it in a job and attach the result |
| put a password in the message | send a single-use link with an expiry |

The middle row is the pattern the authentication generator uses: a token with an expiry, a link, and nothing secret in
the message itself. It is the same design as every password reset you have ever used, and the reason is that mail
travels through servers nobody controls and sits in an inbox indefinitely.

## Inbound mail

Rails has Action Mailbox for mail arriving at the application, with an ingress per provider (Postmark, SendGrid, Mailgun)
and a route that turns a message into a record:

```ruby
# app/mailboxes/library_mailbox.rb
class LibraryMailbox < ApplicationMailbox
  def process
    WaitingEntry.create!(book: Book.find_by(title: subject), member_name: from)
  end
end
```

That is one class per address, with `process` doing the work, and the ingress is a controller that Rails provides. It
is rarely needed and it is worth knowing it exists before wiring a webhook by hand.

## Check yourself

Write an `OverdueMailer` with one message that lists a member's overdue loans, with an HTML view and a text view, and
a preview. Then make the reminder job send it with `deliver_later` and assert both the enqueue and the send in tests.
