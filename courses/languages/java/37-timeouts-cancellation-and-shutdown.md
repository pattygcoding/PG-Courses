---
title: Timeouts, cancellation and shutdown
summary: Bounding every wait, stopping work that is no longer wanted, and a service that stops without losing a request.
chapter: Concurrency
minutes: 13
status: draft
---

## Every wait needs a bound

```java
long total = future.get(5, TimeUnit.SECONDS);

HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(2))
        .build();
```

A call with no timeout is a call that can hang forever, and in a service one hanging dependency is enough to
exhaust the pool and take the whole thing down. Time out the connection, the read, the whole request and the
wait on any future, and pick numbers from a measurement of the slowest normal case rather than from a guess.

```java
try {
    return future.get(5, TimeUnit.SECONDS);
} catch (TimeoutException e) {
    future.cancel(true);
    throw new TimeoutException("count timed out after 5s");
}
```

Cancelling a `Future` with `true` interrupts the running thread. The task has to cooperate, which is what the
interruption convention from the executors page is for: a task that swallows `InterruptedException` keeps
running after you cancelled it, and nothing reports that.

## Shutting an executor down

```java
try (ExecutorService pool = Executors.newFixedThreadPool(4)) {
    pool.submit(task);
}
```

The try-with-resources form calls `shutdown`, waits for the queued tasks, and interrupts if the wait is long
enough that the runtime decides to give up. The explicit version gives you control over the wait:

```java
pool.shutdown();
if (!pool.awaitTermination(30, TimeUnit.SECONDS)) {
    pool.shutdownNow();
}
```

`shutdown` stops accepting new tasks and lets the queue drain. `shutdownNow` interrupts the running tasks and
returns the tasks that never started, which is the version for a process that is stopping anyway. Calling
`shutdownNow` first means work that was nearly finished is thrown away.

## A shutdown hook runs on the way out

```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    server.stop();
    pool.shutdown();
}));
```

The hook runs when the JVM receives a signal or exits normally, which is the place to stop accepting new work
and close resources. It runs once and it must be quick: a hook that waits indefinitely makes the process
unkillable by the ordinary signal, and the operator's next step is a kill that skips it.

## Graceful shutdown in order

1. Stop accepting new work, so a load balancer can move the traffic.
2. Let the in-flight work drain, with a bounded wait.
3. Force the remaining tasks and close the resources.
4. Exit with a status that says whether anything was lost.

That sequence is what makes a deploy invisible: the health check starts failing, requests finish, and the
process goes. Skipping step one cuts live requests, and skipping step two loses them.

## A bounded queue is what makes backpressure possible

```java
ExecutorService pool = new ThreadPoolExecutor(
        4, 4,
        0L, TimeUnit.MILLISECONDS,
        new ArrayBlockingQueue<>(100),
        new ThreadPoolExecutor.CallerRunsPolicy());
```

A `ThreadPoolExecutor` built from the factories uses an unbounded queue, so a producer that outruns the
consumers fills the heap rather than being slowed down. Giving the queue a capacity and choosing a rejection
policy is the decision that keeps the process alive under a spike:

| Policy | What happens when the queue is full |
| --- | --- |
| `AbortPolicy` | throws `RejectedExecutionException`, the default |
| `CallerRunsPolicy` | the submitting thread runs the task, which slows the producer |
| `DiscardPolicy` | the task is dropped silently |
| `DiscardOldestPolicy` | the oldest queued task is dropped |

`CallerRunsPolicy` is the one that produces backpressure instead of failure, because the thread that would
have overwhelmed the pool ends up doing the work.

## A hook must not depend on the pool it is shutting down

```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    pool.shutdown();
    pool.awaitTermination(10, TimeUnit.SECONDS);
}));
```

Shutting down a pool from inside a task running on that pool deadlocks, since the shutdown waits for the task
that is waiting for the shutdown. Run the hook on its own thread, and let it use only resources that other
threads are not waiting on.

## Check yourself

Submit five one-second tasks to a pool and shut it down with a five second wait, then repeat with a
one-second wait and print how many were interrupted. Add a bounded queue with a rejection policy and submit
more tasks than it can hold, and record which policy kept the process responsive.
