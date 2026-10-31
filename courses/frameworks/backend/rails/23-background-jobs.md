---
title: Background jobs and Solid Queue
summary: Work that should not happen during a request, a database-backed queue, and the adapter each environment uses.
chapter: The rest of the stack
minutes: 14
status: draft
---

## A job is a class

```ruby
class LoanReminderJob < ApplicationJob
  queue_as :default

  def perform(loan_id)
    loan = Loan.find(loan_id)
    # ...
  end
end
```

```ruby
LoanReminderJob.perform_later(loan.id)   # writes the job to the queue
LoanReminderJob.perform_now(loan.id)     # runs it here, for a test or a console
```

Everything between those two is the adapter's business, which is Active Job's whole point: the application says what to
do and the adapter decides where it happens.

The argument has to be serialisable. An id is the safe choice; a record works through GlobalID:

```ruby
LoanReminderJob.perform_later(loan)      # serialised as a signed reference
```

That costs a re-read when the job runs, which is usually what you want, and it has a failure mode: the row may be gone.
`discard_on ActiveJob::DeserializationError` is how a job says that is acceptable.

## What the installer wrote

```ruby
# Gemfile
gem "solid_cache"
gem "solid_queue"
gem "solid_cable"
```

```bash
bundle exec rails solid_queue:install
```

```text
      create  config/queue.yml
      create  config/recurring.yml
      create  db/queue_schema.rb
      create  bin/jobs
        gsub  config/environments/production.rb
```

```yaml
# config/queue.yml
default: &default
  dispatchers:
    - polling_interval: 1
      batch_size: 500
  workers:
    - queues: "*"
      threads: 3
      processes: <%= ENV.fetch("JOB_CONCURRENCY", 1) %>
      polling_interval: 1
```

Solid Queue keeps jobs in a database table rather than in Redis, and the reason is the transaction: a job and the row
it is about can be committed together, so `after_commit` plus a database queue means no job can be enqueued for a
record that was never written.

A dispatcher polls for ready jobs and workers run them. `threads: 3` is three jobs at once in one process, and
`processes:` is how more cores get used, because Ruby threads do not run CPU work in parallel.

`bin/jobs` is the worker process, and `config/recurring.yml` is where a schedule lives:

```yaml
production:
  overdue_notice:
    class: OverdueNoticeJob
    schedule: every day at 9am
  clear_solid_queue_finished_jobs:
    command: "SolidQueue::Job.clear_finished_in_batches(sleep_between_batches: 0.3)"
    schedule: every hour at minute 12
```

A recurring task is a job with a schedule, written in the application's own configuration rather than in a crontab
somewhere else. The second entry is the generated one, and it is a good example of a task that exists to keep the
queue's own table small.

## The adapter each environment has

```text
development   ActiveJob::QueueAdapters::AsyncAdapter   jobs run in a thread of the web process
test          ActiveJob::QueueAdapters::TestAdapter    jobs are collected, not run
production    solid_queue, from config/environments/production.rb
```

Those three came out of the running application, and the first one is the one that surprises people: in development a
`perform_later` runs without any worker, because the framework uses an in-process thread. Nothing in the code changes;
the environment does.

## Testing a job, two ways

```ruby
test "recording a loan enqueues a reminder" do
  assert_enqueued_with(job: LoanReminderJob) do
    Loan.create!(book: books(:dune), member: members(:ada), days: 7)
  end
end
```

```ruby
test "the reminder job records that it ran" do
  perform_enqueued_jobs { LoanReminderJob.perform_later(loans(:current_dune).id) }

  assert loans(:current_dune).reload.reminded_at.present?
end
```

The first is about the application's decision to enqueue, which should not depend on the queue existing. The second is
about the job's own work, which should not depend on being enqueued. `assert_no_enqueued_jobs(only: ...)` is the third
shape, for the case where a job must not be scheduled.

That distinction is worth keeping in a real suite, because a test that only runs jobs inline will pass while the
enqueue is broken, and a test that only asserts the enqueue will pass while `perform` is broken.

## Retries

```ruby
class LoanReminderJob < ApplicationJob
  retry_on Net::ReadTimeout, wait: :polynomially_longer, attempts: 5
  discard_on ActiveJob::DeserializationError
end
```

`retry_on` re-enqueues the job with a delay and gives up after a number of attempts, at which point the error is raised
and the job is marked failed. `discard_on` throws it away without retrying. It is the same decision as the retry loop in
the Ruby course's HTTP page: retry what can succeed on a second try, and bound the attempts.

## When a job is the wrong answer

| Situation | Better |
| --- | --- |
| the user is waiting for the result | do it in the request |
| it must never happen twice | a unique index and a job that checks it |
| it must happen in order | one queue, one worker thread |
| it needs the request's session | pass what the job needs instead |
| it takes ten milliseconds locally | a method call |

The last row is the one that gets forgotten. A job adds a serialisation step, a worker to run, a retry policy to
decide and a delay between cause and effect. It earns its place for mail, for another service, and for anything a
person is not waiting for, and the reason is not speed: a request should not fail because somebody else's server is
down.

## Check yourself

Write `LoanReminderJob` for a loan that is due in three days, enqueue it from an `after_commit` on `Loan`, and write
both tests: the enqueue assertion and one that runs the job with `perform_enqueued_jobs` and checks the effect.
