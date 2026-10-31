---
title: Installing Rails and creating an application
summary: Two ways to install it, one command to create the app, and the step that quietly fails.
chapter: Getting started
minutes: 15
status: draft
---

## Two ways to install it

```bash
gem install rails
```

That installs Rails and its forty-odd dependencies into the Ruby installation, and it is what you do when you want the
`rails` command available everywhere. On this machine the gems went into the user directory RubyInstaller configured,
and the executable directory was not on `PATH`, which is the subject of the Ruby course's second page.

The other way is a project of its own:

```ruby
# Gemfile
source "https://rubygems.org"

gem "rails", "~> 8.1", ">= 8.1.4"
```

```bash
bundle install
```

```text
Bundle complete! 1 Gemfile dependency, 66 gems now installed.
```

That is what this course used, and it has two advantages. The version is pinned, so the application is created by the
Rails you asked for rather than by whichever one the machine happened to have. And every command goes through
`bundle exec`, so there is no `PATH` question at all:

```bash
bundle exec rails -v
```

```text
Rails 8.1.4
```

## Creating the application

```bash
bundle exec rails new pg-rails-verify --database=sqlite3
```

`rails new` writes an application, installs its dependencies, initialises a git repository and runs a set of
generators. The interesting part is what it writes:

```text
create  README.md
create  Rakefile
create  .ruby-version
create  config.ru
create  Gemfile
run  git init from "."
create  app/assets/stylesheets/application.css
create  app/controllers/application_controller.rb
create  app/helpers/application_helper.rb
create  app/jobs/application_job.rb
create  app/mailers/application_mailer.rb
create  app/models/application_record.rb
create  app/views/layouts/application.html.erb
create  app/views/layouts/mailer.html.erb
create  app/views/pwa/manifest.json.erb
create  bin/brakeman
create  bin/bundler-audit
create  bin/ci
create  bin/dev
create  bin/rails
create  bin/setup
create  bin/thrust
create  Dockerfile
create  .dockerignore
create  bin/docker-entrypoint
create  .rubocop.yml
create  .github/workflows
```

Three of those earn their own paragraphs later: `bin/ci` is the whole CI pipeline as a Ruby file, `Dockerfile` plus
`bin/docker-entrypoint` is the container, and `bin/dev` is the one command a new contributor types.

The flags are worth knowing because they exist to keep the generated app small:

| Flag | Leaves out |
| --- | --- |
| `--api` | views, assets and JavaScript |
| `--skip-action-mailer` | mail |
| `--skip-javascript` | importmaps, Turbo and Stimulus |
| `--skip-test` | the test directory and minitest wiring |
| `--skip-kamal` | the deployment configuration |
| `--database=postgresql` | SQLite, in favour of Postgres |

The default is a full application with SQLite, which is what a new project wants: nothing to install, and a database
that is a file.

## The step that fails quietly

`rails new` runs `bundle install` inside the new application, and if it is started from inside another bundle that step
can resolve the wrong Gemfile. The application is still written and the generators that need the bundle then fail one
at a time:

```text
    rails  importmap:install
cannot load such file -- bootsnap/setup (LoadError)
    rails  turbo:install stimulus:install
cannot load such file -- bootsnap/setup (LoadError)
    rails  solid_cache:install solid_queue:install solid_cable:install
cannot load such file -- bootsnap/setup (LoadError)
```

`bootsnap` is in the application's Gemfile, so the message means the application's own gems were never installed. The
fix is one command in the application directory:

```bash
cd pg-rails-verify
bundle install --jobs 8
```

```text
Bundle complete! 23 Gemfile dependencies, 124 gems now installed.
```

Then the generators can be run again, and they are all idempotent:

```bash
bundle exec rails importmap:install
bundle exec rails turbo:install stimulus:install
bundle exec rails solid_cache:install solid_queue:install solid_cable:install
```

```text
      create    app/javascript/application.js
      create    config/importmap.rb
      create    bin/importmap
      create    app/javascript/controllers/hello_controller.js
      create    config/queue.yml
      create    config/recurring.yml
      create    db/queue_schema.rb
      create    bin/jobs
      create    db/cable_schema.rb
```

This is worth the space because the failure mode is misleading. Nothing says "the bundle is wrong"; a missing
`bootsnap` looks like a broken application, and the four generators that follow produce a Rails app that is subtly
half-configured. A new application that cannot boot its own console is worth investigating before writing any code in
it.

## The first run

```bash
bundle exec rails db:prepare
bundle exec rails server
```

```text
* Puma version: 8.0.2 ("Into the Arena")
* Ruby version: ruby 3.4.7 (2025-10-08 revision 7a5688e2a2) +PRISM [x64-mingw-ucrt]
*  Min threads: 3
*  Max threads: 3
*  Environment: development
* Listening on http://127.0.0.1:3000
```

`rails server` starts Puma, which serves the application over HTTP. On Windows Puma runs thread-only, which is the
concurrency page's subject much later; for now the line to notice is `Environment: development`, because that setting
decides which database, which log level and which error pages you get.

## Check yourself

Create an application with `rails new`, start the server, and open `http://localhost:3000`. Then open
`http://localhost:3000/up` and explain what the green page means before looking it up.
