---
title: Security defaults
summary: CSRF, XSS, SQL injection, mass assignment, and the scanners that check the application for you.
chapter: Authentication and security
minutes: 14
status: draft
---

## What Rails does for you

| Attack | Default defence |
| --- | --- |
| cross-site request forgery | the authenticity token on every non-GET request |
| cross-site scripting | `<%= %>` escapes its output |
| SQL injection | placeholders in `where`, and `sanitize_sql_like` |
| mass assignment | `params.expect`, which is an allow list |
| session hijacking | signed, httponly, same-site cookies |
| header injection | Rack strips newlines from header values |
| clickjacking | `X-Frame-Options` from the default headers |
| content sniffing | `X-Content-Type-Options: nosniff` |
| a session that outlives a password change | the `Session` row can be destroyed |

All of that is on in a generated application, and all of it can be turned off by a change. So the useful question to ask
of a diff is whether it touches any of them.

## The three that get switched off by accident

**Escaping.**

```erb
<%= raw @book.notes %>          <%# an XSS hole the moment notes is user input %>
<%= sanitize @book.notes, tags: %w[em strong] %>
```

`raw` and `html_safe` are the two ways to turn escaping off, and both are wrong for anything a user typed. `sanitize`
with an allow list keeps some formatting and no script tags; it is a real parser, and it is the only one of the three
that belongs in a template.

**A query with a string in it.**

```ruby
Book.where("title LIKE '%#{params[:query]}%'")                        # injectable
Book.where("title LIKE ?", "%#{sanitize_sql_like(params[:query])}%")  # not
```

The second is what this application uses. The test that pins the wildcard behaviour is the other half of the same
problem: a `%` typed by a user is data, not a pattern.

**Permitted parameters.** A `params.permit!` anywhere is an allow list that allows everything:

```ruby
Book.new(params.require(:book).permit!)    # a client can set any column
Book.new(params.expect(book: [ :title ]))  # only this one
```

The first is often written to silence a `ForbiddenAttributesError` while debugging, and it is exactly the line that
survives into production because nothing looks wrong.

## Cookies and sessions

```ruby
cookies.signed[:session_id] = { value: session.id, httponly: true, same_site: :lax, secure: true }
```

`secure: true` in production means the cookie only travels over HTTPS, and Rails sets it when
`config.force_ssl = true`. Those three flags plus `force_ssl` are the whole of cookie hardening, and `force_ssl` also
sets the HSTS header, which is what makes a browser refuse plain HTTP for that host afterwards.

## The Content Security Policy

```ruby
# config/initializers/content_security_policy.rb
Rails.application.config.content_security_policy do |policy|
  policy.default_src :self
  policy.script_src  :self
  policy.style_src   :self
  policy.img_src     :self, :data, "https:"
end
```

The generated file has all of that commented out, and turning it on changes how the browser loads things. It is the
defence that catches an injected `<script>` even when the escaping was missed, and importmaps work with it because the
modules come from `self`. An inline `<script>` tag does not, and switching the policy on is usually the moment a project
finds out how many it has.


## The two scanners

```bash
bin/brakeman -q --no-pager
```

```text
== Brakeman Report ==

Application Path: C:/Users/patty/Programming/Scrapyard/pg-rails-verify
Rails Version: 8.1.4
Brakeman Version: 8.1.0
Checks Run: BasicAuth, CSRFTokenForgeryCVE, ContentTag, CookieSerialization, CreateWith,
CrossSiteScripting, DefaultRoutes, Deserialize, DetailedExceptions, EscapeFunction, Evaluation,
Execute, FileAccess, FileDisclosure, MassAssignment, Redirect, Render, SQL, Send, SessionSettings,
TemplateInjection, UnsafeReflection, WithoutProtection, XMLDoS, YAMLParsing

== Overview ==

Controllers: 6
Models: 8
Templates: 14
Errors: 0
Security Warnings: 0

== Warning Types ==


No warnings found
```

That is this application as it stands: nothing found. Brakeman reads the code rather than running it, so it can run on
every commit, and it is the tool that finds the injected `where` string and the `permit!` above rather than a reviewer.

```bash
bin/bundler-audit
bin/importmap audit
```

`bundler-audit` checks `Gemfile.lock` against a database of known-vulnerable gem versions, and `importmap audit` does the
same for the pinned JavaScript. Both are steps in the generated CI file:

```ruby
# config/ci.rb
CI.run do
  step "Setup", "bin/setup --skip-server"

  step "Style: Ruby", "bin/rubocop"

  step "Security: Gem audit", "bin/bundler-audit"
  step "Security: Importmap vulnerability audit", "bin/importmap audit"
  step "Security: Brakeman code analysis", "bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error"
  step "Tests: Rails", "bin/rails test"
  step "Tests: Seeds", "env RAILS_ENV=test bin/rails db:seed:replant"
end
```

Six steps in one file, and `bin/ci` runs them. That is the value: the checks belong to the repository rather than to
somebody's memory, and `--exit-on-warn` on Brakeman means a new warning fails the build instead of being read by nobody.

## What is not automatic

| Still your job | Why |
| --- | --- |
| authorisation | the framework does not know who may do what |
| rate limiting per action | only the sign-in flow is limited by default |
| parameter filtering | a new field is permitted only if you add it |
| uploads | a file's type and size are your checks |
| dependencies | an audit tells you a gem is vulnerable; somebody has to update it |
| the content security policy | generated commented out, because it breaks things |

## Check yourself

Run `bin/brakeman` and `bin/bundler-audit` against the application. Then add `params.permit!` to a copy of the loan
action, run Brakeman again, and read what it says about that line.
