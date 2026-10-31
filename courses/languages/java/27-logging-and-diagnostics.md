---
title: Logging and diagnostics
summary: Levels and parameters, what never to log, and the tools that tell you what a running JVM is doing.
chapter: Errors, resources and diagnostics
minutes: 13
status: draft
---

## System.out is not logging

```java
System.out.println("loading " + path);
```

That line has no level, no timestamp, no source class and no way to turn it off. `println` synchronises on
the stream, so it serialises every thread that calls it, and it writes to a destination a production run
usually discards. It belongs in a scratch program and nowhere else.

## A facade and an implementation

```groovy
dependencies {
    implementation 'org.slf4j:slf4j-api:2.0.16'
    runtimeOnly 'ch.qos.logback:logback-classic:1.5.12'
}
```

```java
private static final Logger log = LoggerFactory.getLogger(Report.class);

log.info("loaded {} rows from {}", rows.size(), path);
```

SLF4J is the facade the code calls, and Logback or Log4j2 is the implementation that decides where the
lines go. Keeping the two apart means a library can log without forcing a logging framework on whoever
depends on it, which is why nearly every library uses the facade.

## Levels mean something specific

| Level | Use it for |
| --- | --- |
| `ERROR` | a request or a job failed and someone needs to know |
| `WARN` | something recovered, or a configuration looks wrong |
| `INFO` | a lifecycle event: started, listening, loaded, shutting down |
| `DEBUG` | detail useful while investigating a problem |
| `TRACE` | per item detail, off in every environment except a short investigation |

The common mistake is logging per request at INFO. A service handling a thousand requests a second writes a
thousand lines a second, the disk fills, and the lines that mattered are lost in the volume. Reserve INFO
for things that happen once per process, and let metrics carry the per request numbers.

## Parameters, not concatenation

```java
log.debug("row {} has value {}", row.key(), row.value());
```

The message is built only when DEBUG is enabled, since the parameters stay untouched otherwise. That matters
in a loop, where concatenating a string for a disabled level costs an allocation per iteration.

## The exception is the last argument

```java
try {
    parse(line);
} catch (RuntimeException e) {
    log.error("cannot parse record on line {}", lineNumber, e);
}
```

Passing the exception as the last argument logs the whole stack trace and the cause chain. Putting it in the
message calls `toString` and prints one line with the class name and message, which is the part that was
already going to be in the log.

## What never goes in a log

- A token, a password, a session identifier or a full request body with credentials in it.
- Personal data the application has no reason to retain, since a log file is a data store with a long life.
- A whole payload at INFO. Log the identifier and the size, and log the body only at DEBUG with a reason.

A log line written once and copied into a ticket is permanent, so it is worth treating the log as a place
where data can leak.

## Correlation between lines

```java
MDC.put("requestId", requestId);
try {
    process();
} finally {
    MDC.clear();
}
```

The mapped diagnostic context attaches a value to the current thread, and a pattern that includes it puts
the same identifier on every line a request produces. A single line becomes traceable across a service that
handled thousands of requests at the same time.

## Configuration

```xml
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>%d{ISO8601} %-5level [%X{requestId}] %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>

  <root level="INFO">
    <appender-ref ref="STDOUT" />
  </root>
</configuration>
```

A framework such as Spring Boot reads the level from `application.properties` instead, and the point is the
same: the level and the destination come from configuration rather than from code, so turning up the detail
in one environment is a settings change and a restart rather than a build.

## Beyond logging

```bash
jcmd <pid> VM.command_line
jcmd <pid> Thread.print
jcmd <pid> GC.heap_info
```

`jcmd` talks to a running JVM and can print the thread dump, the heap summary and the command line it was
started with. A thread dump answers "what is it doing right now", which is the question a log cannot answer
when a service is hung. The JVM chapter covers the rest of the toolset.

## Assertions

```java
assert rows.size() < 1000 : "too many rows: " + rows.size();
```

A Java `assert` is disabled unless the program is started with `-ea`, and it throws `AssertionError` when it
fails. That makes it a development check rather than a validation: enable it in tests, and leave it off in
production where the check would be a cost nobody agreed to pay.

## Check yourself

Replace three `System.out.println` calls with logger calls at the right levels, add a parameterised message,
and log an exception as the last argument. Then run the program twice with the level set differently and
confirm the output changes without a rebuild.
