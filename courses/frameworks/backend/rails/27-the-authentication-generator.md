---
title: The authentication generator
summary: One command that writes the models, the controller, the mailer and the tests, and what each file does.
chapter: Authentication and security
minutes: 15
status: draft
---

## What the generator writes

```bash
bundle exec rails generate authentication
```

```text
      create    app/views/sessions/new.html.erb
      create  app/models/session.rb
      create  app/models/user.rb
      create  app/models/current.rb
      create  app/controllers/sessions_controller.rb
      create  app/controllers/concerns/authentication.rb
      create  app/controllers/passwords_controller.rb
      create  app/channels/application_cable/connection.rb
      create  app/mailers/passwords_mailer.rb
      insert  app/controllers/application_controller.rb
       route  resources :passwords, param: :token
       route  resource :session
        gsub  Gemfile
    generate  migration
       rails  generate migration CreateUsers email_address:string!:uniq password_digest:string! --force
      create    db/migrate/20261031135809_create_users.rb
      create    db/migrate/20261031135811_create_sessions.rb
      create    test/fixtures/users.yml
      create  test/test_helpers/session_test_helper.rb
```

Fifteen files, two migrations, two routes and one line uncommented in the Gemfile. That is a whole password-based sign-in
for a Rails 8 application.

## The model

```ruby
class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }
end
```

`has_secure_password` is why the Gemfile now needs `bcrypt`. It adds a `password=` setter that writes a digest, a
`password` reader that is not persisted, and an `authenticate(password)` method that compares.

The rules live in the schema line the generator wrote:

```text
email_address:string!:uniq password_digest:string!
```

`!` means `null: false` and `uniq` means a unique index. The index is the guarantee: the model has no uniqueness
validation at all, so the database refuses the second row and the application rescues the exception.

`normalizes` runs on assignment, so `"  ADA@Example.com "` becomes `"ada@example.com"` before anything else sees it.

## The session as a record

```ruby
class Session < ApplicationRecord
  belongs_to :user
end
```

```text
user:references ip_address:string user_agent:string
```

A session is a row rather than a signed cookie payload, which is what makes it possible to list every signed-in device,
revoke one, and record the address that used it. "Sign out everywhere" is a delete.

## The concern

```ruby
module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :require_authentication
    helper_method :authenticated?
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private
    def require_authentication
      resume_session || request_authentication
    end

    def resume_session
      Current.session ||= find_session_by_cookie
    end

    def find_session_by_cookie
      Session.find_by(id: cookies.signed[:session_id])
    end

    def request_authentication
      session[:return_to_after_authenticating] = request.url
      redirect_to new_session_path
    end

    def start_new_session_for(user)
      user.sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |session|
        Current.session = session
        cookies.signed.permanent[:session_id] = { value: session.id, httponly: true, same_site: :lax }
      end
    end

    def terminate_session
      Current.session.destroy
      cookies.delete(:session_id)
    end
end
```

Five things in that file are the whole design:

- `before_action :require_authentication` inside `included` means every controller requires a session the moment the
  module is included. Secure by default, with an explicit opt-out.
- `allow_unauthenticated_access only: %i[index show]` is that opt-out, and it reads as a sentence at the top of the
  controller it applies to.
- `cookies.signed[:session_id]` cannot be changed by a client, and the value is an id rather than a payload, so nothing
  else has to be trusted.
- `httponly: true` keeps the cookie out of JavaScript and `same_site: :lax` stops it travelling on a cross-site POST.
- `session[:return_to_after_authenticating] = request.url` remembers where the user was going, which is why signing in
  from a book page lands back on that book page.

## Current

```ruby
class Current < ActiveSupport::CurrentAttributes
  attribute :session
  delegate :user, to: :session, allow_nil: true
end
```

`CurrentAttributes` holds values for one request and resets them afterwards, which is what makes `Current.user` available
in a view and a service without passing it through every call. `Current.session ||= find_session_by_cookie` means the
cookie is read once per request however many things ask for it.

The cost is that `Current` is a global for the request and a background job does not have one. A job that needs the user
is given the user, which is what the generator's mailer does: `PasswordsMailer.reset(user)`.

## The controller

```ruby
class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ new create ]
  rate_limit to: 10, within: 3.minutes, only: :create,
    with: -> { redirect_to new_session_path, alert: "Try again later." }

  def create
    if user = User.authenticate_by(params.permit(:email_address, :password))
      start_new_session_for user
      redirect_to after_authentication_url
    else
      redirect_to new_session_path, alert: "Try another email address or password."
    end
  end

  def destroy
    terminate_session
    redirect_to new_session_path, status: :see_other
  end
end
```

`User.authenticate_by` is one query and a constant-time comparison: it hashes the supplied password even when no user was
found, which stops an attacker learning which addresses exist by timing the response.

`rate_limit to: 10, within: 3.minutes` is built into Rails 8 and is the protection against password guessing. It uses the
cache store, which is a detail worth knowing: where the cache is `:null_store`, it does nothing.

The failure message covers both cases on purpose. "Try another email address or password" is not helpful, and the
alternative is a way to enumerate accounts.

## Signing in, verified

The application's own flow in a browser: the header linked to `/session/new`, the form took an email address and a
password, and the page came back with both the address and a sign-out button in the header:

```text
librarian@northside.test   [Sign out]
```

That button is the `button_to` from the forms page posting to `session_path` with `method: :delete`, so signing out is a
delete of a row.

## Testing it

The generator writes the helper every other test leans on:

```ruby
module SessionTestHelper
  def sign_in_as(user)
    Current.session = user.sessions.create!

    ActionDispatch::TestRequest.create.cookie_jar.tap do |cookie_jar|
      cookie_jar.signed[:session_id] = Current.session.id
      cookies["session_id"] = cookie_jar[:session_id]
    end
  end
end
```

`test_helper.rb` loads it into every integration test through an `ActiveSupport.on_load` hook, which is why
`sign_in_as users(:librarian)` works without an include. It signs in by creating a session row and setting the signed
cookie, so no password is involved and a test does not depend on the sign-in form working.

## Check yourself

Add a `MembersController` that requires a session for one action and allows a public one, then test both. Then find the
session row in the console, delete it, and confirm the next request is signed out.

    end

    def find_session_by_cookie
      Session.find_by(id: cookies.signed[:session_id])
    end

    def request_authentication
      session[:return_to_after_authenticating] = request.url
      redirect_to new_session_path
    end

    def start_new_session_for(user)
      user.sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |session|
        Current.session = session
        cookies.signed.permanent[:session_id] = { value: session.id, httponly: true, same_site: :lax }
      end
    end

    def terminate_session
      Current.session.destroy
      cookies.delete(:session_id)
    end
end
```

Five things in that file are the whole design:

- `before_action :require_authentication` inside `included` means every controller requires a session the moment the
  module is included. Secure by default, with an explicit opt-out.
- `allow_unauthenticated_access only: %i[index show]` is that opt-out, and it reads as a sentence at the top of the
  controller it applies to.
- `cookies.signed[:session_id]` cannot be changed by a client, and the value is an id rather than a payload, so nothing
  else has to be trusted.
- `httponly: true` keeps the cookie out of JavaScript and `same_site: :lax` stops it travelling on a cross-site POST.
- `session[:return_to_after_authenticating] = request.url` remembers where the user was going, which is why signing in
  from a book page lands back on that book page.
