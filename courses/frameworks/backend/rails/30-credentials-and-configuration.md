---
title: Credentials and configuration
summary: An encrypted file for secrets, ENV for the rest, and the initializers that run at boot.
chapter: Authentication and security
minutes: 13
status: draft
---

## Two files, one secret

```text
config/credentials.yml.enc    encrypted secrets, checked into the repository
config/master.key             the key that decrypts them, not checked in
```

That pair is the whole of Rails' secret handling. The encrypted file goes into git, so a new checkouts has the keys it
needs; the master key does not, so the repository is not a secret store. `rails new` adds `config/master.key` to
`.gitignore` and creates both files.

```bash
EDITOR="code --wait" bin/rails credentials:edit
EDITOR="code --wait" bin/rails credentials:edit --environment production
bin/rails credentials:show
```

```yaml
# config/credentials.yml.enc
secret_key_base: 6fa1...

aws:
  access_key_id: AKIA...
  secret_access_key: ...
```

```ruby
Rails.application.credentials.secret_key_base
Rails.application.credentials.dig(:aws, :access_key_id)
Rails.application.credentials.dig(:aws, :secret_access_key) || ENV["AWS_SECRET_ACCESS_KEY"]
```

`secret_key_base` is generated for you, and it is the key behind the signed cookies and the session. Losing it
invalidates every session; leaking it lets somebody forge one, which is why it lives in credentials rather than in an
environment variable that gets copied into a chat message.

Per-environment credentials are the newer half of the feature: `--environment production` writes
`config/credentials/production.yml.enc` with its own key, so a development machine can hold development secrets and
nothing else.

## ENV, and when it is the better answer

| Use credentials for | Use ENV for |
| --- | --- |
| anything the application must have to boot | anything the platform injects |
| a secret shared by every environment | a value that differs per deploy, such as a URL |
| a key that a rotation invalidates | a feature flag the platform decides |

`config/credentials.yml.enc` on a hosting platform means the platform needs the master key anyway, so most deployments
pass it in as `RAILS_MASTER_KEY`. The pattern that works everywhere is the one in the snippet above: read from
credentials, fall back to ENV.

```ruby
Rails.application.credentials.dig(:smtp, :password) || ENV["SMTP_PASSWORD"]
```

## Initializers

```text
config/initializers/assets.rb
config/initializers/content_security_policy.rb
config/initializers/filter_parameter_logging.rb
config/initializers/inflections.rb
```

Four files in a generated application, run in alphabetical order at boot, and one place to put configuration:

```ruby
# config/initializers/inflections.rb
ActiveSupport::Inflector.inflections(:en) do |inflect|
  inflect.acronym "ISBN"
end

# config/initializers/filter_parameter_logging.rb
Rails.application.config.filter_parameters += [ :password, :token, :secret, :card ]

# config/initializers/assets.rb
Rails.application.config.assets.paths << Rails.root.join("app/assets/fonts")
```

The filter list is the one to read before writing any logging code: anything named there is replaced with
`[FILTERED]` in the log, so a password posted to a form never lands in `log/development.log` in plain text. A new
sensitive parameter goes in that list, and it goes in at the same time as the field.

## Per-environment configuration

```ruby
# config/environments/production.rb
config.cache_store = :solid_cache_store
config.active_job.queue_adapter = :solid_queue
config.solid_queue.connects_to = { database: { writing: :queue } }
config.action_mailer.default_url_options = { host: "library.example.com", protocol: "https" }
config.force_ssl = true
```

Those five lines are the difference between a development machine and a server: caching and jobs move to the database,
mail needs a real host, and HTTPS is forced. `config/environments/test.rb` is the third version, with eager loading off
and the null cache store so that a test cannot pass on a value somebody else's test cached.

An environment hash needs to agree with the process's environment variable. `RAILS_ENV=production` selects the file, and
a `production` section in `database.yml` selects the database, so the two are read separately and can be set
inconsistently. The banner from `rails about` is the quick check:

```text
Environment               development
Database adapter          sqlite3
```

## What not to put in a config file

| Temptation | Better |
| --- | --- |
| a list of admin email addresses | a role in the database, so it can change without a deploy |
| prices or business rules | the database, if they change without code |
| a third-party key per environment | credentials with an environment section |
| a feature toggle the platform controls | ENV, so the platform can flip it |
| anything a test needs to set differently | a method with a default the test can pass in |

The last row is the one that improves a codebase most. Configuration read from a global at the point of use cannot be
changed by a test, so the test ends up stubbing the global, which is slower and more brittle than passing the value.

## Check yourself

Add an SMTP password to the credentials file, read it with a fallback to ENV, and confirm both paths work by unsetting
the variable. Then add a `:card_number` parameter to the log filter list and check what a request containing it looks
like in `log/development.log`.
