---
title: Operating the service
summary: Probes, graceful shutdown, migrations during a deploy, and what to look at when it is slow.
chapter: Packaging and deployment
minutes: 13
status: draft
---

## One image, many environments

The image contains the code and no environment. Every setting that differs arrives as an environment variable or
a mounted file, which is what makes a build once, deploy many workflow possible and what makes a rollback a
change of image tag.

```yaml
spring:
  application:
    name: tool

server:
  port: 8080
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 20s

management:
  endpoint:
    health:
      probes:
        enabled: true
      group:
        readiness:
          include: db,ping
```

## Probes decide whether the pod lives

```yaml
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8081
  periodSeconds: 5

livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8081
  periodSeconds: 10
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8081
  failureThreshold: 30
  periodSeconds: 2
```

A readiness probe takes the pod out of the load balancer without stopping it, and a liveness probe restarts it.
Putting the database in the liveness group means a slow database restarts every replica in turn, which makes the
outage worse. The readiness group is where a dependency belongs.

A startup probe covers the slow first start that comes from the context, the migrations and the JIT warmup, so the
liveness probe does not kill a service that is still coming up.

## Graceful shutdown has an order

```yaml
terminationGracePeriodSeconds: 40
```

The sequence is: the readiness probe starts failing so no new traffic arrives, the pre-stop delay gives the load
balancer time to notice, the application finishes its in-flight requests, and then the process exits. The
platform's grace period has to be longer than the application's shutdown timeout, or the process is killed while
it is still draining.

```java
@PreDestroy
void stop() {
    executor.shutdown();
}
```

A `@PreDestroy` method runs during shutdown and is the place to stop a poller or close a client. A bean holding a
thread pool is the usual one that needs it.

## Migrations in a rolling deploy

Two versions of the application run at the same time during a rolling deploy, so the schema has to work for both.
That rules out a destructive change in the same release:

| Step | Release |
| --- | --- |
| Add the new column, nullable, written by both | 1 |
| Backfill the old rows | 1 or a job |
| Read from the new column, still writing both | 2 |
| Stop writing the old column | 3 |
| Drop the old column | 4 |

That is the expand and contract pattern, and it is the price of a deploy that does not need downtime. A rename
done in one release breaks the version that is still running, and the failure appears halfway through a rollout.

Flyway runs at start-up by default, so the first pod of a new version applies the migration and the others find it
applied. A locking row in `flyway_schema_history` means two pods starting together do not both run the same file.

## Logs go to stdout

```yaml
logging:
  structured:
    format:
      console: ecs
```

A container has no log file to rotate, so the application writes to standard output and the platform collects it.
JSON output is what a log platform indexes usefully, and Boot 3.4 can write it with the `structured` setting. A
file appender in a container either fills the disk or is thrown away with the container.

The correlation identifier from the web layer page is what ties a request's lines together, and a trace or span
identifier in the same field is what ties them to the rest of the system.

## Resources and the JIT

A CPU limit that throttles the container slows the JIT compiler down with everything else, so a service that looks
slow under a limit has often not finished warming up. A memory limit with no `-XX:MaxRAMPercentage` set means the
JVM sizes the heap to a default fraction of the limit, which is usually fine and worth stating explicitly.

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    memory: 1Gi
```

Requests decide scheduling and limits decide killing. A memory limit below what the JVM needs produces either an
`OutOfMemoryError` or a kill, and the two are worth telling apart: the first appears in the logs, and the second
appears as an exit code with no stack trace.

## What to look at during an incident

1. **The dashboard.** Latency, error rate and saturation. Which of the three moved is what directs the next step.
2. **The health endpoint.** If readiness is down, the indicator that is down names the dependency.
3. **The logs.** Filtered to ERROR and to the correlation identifier from a failing request.
4. **A thread dump** if it is hanging rather than failing.
5. **The pool metrics** if requests are queued or timing out. `hikaricp.connections.pending` above zero means the
   database is the bottleneck.
6. **A heap and GC line** if memory is growing.

The failures that come up most in a service of this shape are a connection pool exhausted by a slow query, a
missing index on a column the code filters by, an N plus one query introduced by a new association, and a thread
pool blocking on a remote call with no timeout. Each one has a metric that shows it before the alert.

## Rollback first

A deploy that made things worse is rolled back before it is debugged, and the diagnosis happens on a system that
is working. That requires the previous image to still exist, the migrations to be compatible with it, and the
decision to be someone's without a meeting.

## Check yourself

Add readiness and liveness probes pointing at the right groups, set a grace period longer than the shutdown
timeout, and start the service with both probes failing for a dependency to see which one the platform acts on.
Then write the five steps of an expand and contract change for a column you would rename.
