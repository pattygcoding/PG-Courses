---
title: Docker and Kamal
summary: The container the generator wrote, the entrypoint that migrates, and one command that deploys it.
chapter: Operations
minutes: 15
status: draft
---

## The container

```dockerfile
# syntax=docker/dockerfile:1

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=3.4.7
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base

# Rails app lives here
WORKDIR /rails

# Install base packages
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl libjemalloc2 libvips sqlite3 && \
    ln -s /usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Set production environment variables and enable jemalloc for reduced memory usage and latency.
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development" \
    LD_PRELOAD="/usr/local/lib/libjemalloc.so"
```

Four decisions are in those twenty lines:

- `-slim` rather than a full image, with the four packages the application needs installed by name.
- `libjemalloc2` and `LD_PRELOAD`: a different memory allocator, which uses less memory and is measurably faster for a
  long-running process. The `ln -s` is there because the library's path differs by architecture.
- `BUNDLE_WITHOUT="development"` keeps the development gems out of the image, so a production container cannot run
  RuboCop even by accident.
- `RAILS_ENV="production"` is set in the image, so a container cannot be started in the wrong environment by a forgotten
  variable.

## The build stage

```dockerfile
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libvips libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY vendor/* ./vendor/
COPY Gemfile Gemfile.lock ./

RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache && \
    bundle exec bootsnap precompile -j 1 --gemfile

COPY . .

RUN bundle exec bootsnap precompile -j 1 app/ lib/

RUN chmod +x bin/* && \
    sed -i "s/\r$//g" bin/* && \
    sed -i 's/ruby\.exe$/ruby/' bin/*

RUN SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile
```

The two-stage build is the standard trick: the toolchain is installed in the first stage and only the resulting gems are
copied into the second, which is why the final image is a fraction of the size. `COPY Gemfile Gemfile.lock ./` before
`COPY . .` is the cache layer that matters: changing application code does not reinstall every gem.

Three lines are for a project developed on Windows. `chmod +x bin/*` and the two `sed` commands strip carriage returns
and rewrite `ruby.exe` to `ruby`, because the scripts in `bin/` were written on a machine where every executable has
`.exe`. Without them, `bin/rails` inside the container is not runnable.

`SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile` is the neatest line in the file. Compiling assets does not need
the real secret, so the dummy means the build does not need `RAILS_MASTER_KEY` at all. A build that needed the key would
require the CI machine to hold a production secret, which is a secret in a build log waiting to happen.


## The final image

```dockerfile
FROM base

# Run and own only the runtime files as a non-root user for security
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash
USER 1000:1000

# Copy built artifacts: gems, application
COPY --chown=rails:rails --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --chown=rails:rails --from=build /rails /rails

# Entrypoint prepares the database.
ENTRYPOINT ["/rails/bin/docker-entrypoint"]

# Start server via Thruster by default, this can be overwritten at runtime
EXPOSE 80
CMD ["./bin/thrust", "./bin/rails", "server"]
```

`USER 1000:1000` is the security decision: the process does not run as root, so a bug that lets somebody write a file
cannot overwrite the image. The cost is that everything the application writes has to be writable by that user, which is
what the volume for `storage/` in `config/deploy.yml` is for.

`CMD ["./bin/thrust", "./bin/rails", "server"]` starts Thruster, a small reverse proxy in front of Puma that handles
HTTP/2, caching headers, gzip and X-Sendfile. It is why the container listens on port 80 rather than 3000, and why the
image runs one Ruby process rather than a second web server.

## The entrypoint

```bash
#!/bin/bash -e

# If running the rails server then create or migrate existing database
if [ "${@: -2:1}" == "./bin/rails" ] && [ "${@: -1:1}" == "server" ]; then
  ./bin/rails db:prepare
fi

exec "${@}"
```

Six lines that do one thing: when the container is started to run the server, prepare the database first. `db:prepare`
creates the database if it is missing, runs the pending migrations, and does nothing when there is nothing to do, which
makes it safe on every boot.

The condition keeps it out of the other commands: a container started for a console or a job worker does not migrate. And
`exec` matters, because it replaces the shell with the command, so the Ruby process is the one the container runs and a
signal reaches it rather than the shell.

For a serious deployment, migrating on boot is a conversation rather than a default: two containers starting at once both
run `db:prepare`, and while Rails takes a lock for the migration, rolling back a bad one is easier when it is a step in
the deploy rather than a side effect of starting a server.


## Kamal

```yaml
# config/deploy.yml
service: pg_rails_verify

image: pg_rails_verify

servers:
  web:
    - 192.168.0.1
  # job:
  #   hosts:
  #     - 192.168.0.1
  #   cmd: bin/jobs

registry:
  server: localhost:5555
```

That is the file the generator writes: one server, with the job container commented out. `servers.web` is where the
application runs, and a `job` entry with `cmd: bin/jobs` is where the Solid Queue worker runs. That is the deployment
shape for everything in this course: one web container and one worker container, the same image, different commands.

```bash
kamal setup          # first deploy: install Docker on the server, start everything
kamal deploy         # build, push, start the new container, health check, switch over
kamal app logs -f    # follow the application log
kamal app exec -i "bin/rails console"
kamal rollback       # back to the previous image when the health check fails
kamal app details    # what is running
```

`kamal deploy` builds the image, pushes it to the registry, starts a container on each server and waits for the health
check before routing traffic to it. The check is the `/up` endpoint Rails generates:

```text
<!DOCTYPE html><html><body style="background-color: green"></body></html>
```

That green page came from the running application, and the design is deliberate: it answers 200 while the application
boots without raising, which is the only thing a load balancer can usefully check. `kamal rollback` is the other half, and
it works because the previous image is still on the server and a container is replaced rather than rebuilt.

## The secrets

```yaml
env:
  clear:
    SOLID_QUEUE_IN_PUMA: true
  secret:
    - RAILS_MASTER_KEY
```

`.kamal/secrets` reads the values from somewhere, and those two entries are the whole pattern. `RAILS_MASTER_KEY`
decrypts `config/credentials.yml.enc`, which is how every other secret reaches the process, so the deployment passes one
secret rather than twenty. `SOLID_QUEUE_IN_PUMA: true` runs the job worker inside the web process, which is the simple
deployment: fewer containers, and a job cannot outlive the container that queued it.

## What this chapter skipped

| Not covered | Where it belongs |
| --- | --- |
| TLS certificates | `kamal-proxy` with Let's Encrypt, or a load balancer |
| a second web server | `servers.web` takes a list, and the database leaves the container |
| Postgres | `database.yml`, a service container and a volume |
| backups | a separate concern, and the reason to know where the data lives |
| monitoring | `/up`, a log aggregator and an error tracker |
| zero-downtime migrations | two migrations, one to add and one to remove, in two deploys |

The last row is the one that bites in production: dropping a column in the same deploy as the code that stopped using it
breaks the old containers still serving traffic. The habit is one migration to add the new shape, a deploy, and a second
migration to remove the old one.

## Check yourself

Build the image, run it with a master key, and open `/up` on port 80. Then read `config/deploy.yml` and write out what you
would change to deploy to a host with Postgres instead of SQLite.
