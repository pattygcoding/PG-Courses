---
title: Actuator, health and metrics
summary: The endpoints a platform asks about, and the counters that tell you what the service is doing.
chapter: Observability and testing
minutes: 13
status: draft
---

## The starter adds the endpoints

```groovy
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
```

Without the exposure list only `health` is served over HTTP, and the rest are still there for the other
channels. A wildcard `include: '*'` publishes the heap dump, the environment and the configuration properties,
which is a data disclosure rather than a feature.

| Endpoint | Answers |
| --- | --- |
| `/actuator/health` | is the service able to work |
| `/actuator/info` | build and version information |
| `/actuator/metrics` | the meter registry |
| `/actuator/loggers` | read and change log levels at run time |
| `/actuator/mappings` | every route, which is useful when a 404 is unexplained |

```yaml
management:
  server:
    port: 8081
```

A separate management port keeps the endpoints off the public interface so a load balancer and a firewall can
treat them differently. The alternative is an authorization rule on `/actuator/**`, which is the minimum for a
service that exposes them on the same port.

## Health is a tree of indicators

```java
@Component
public class PricingHealthIndicator implements HealthIndicator {
    private final PricingClient client;

    @Override
    public Health health() {
        return client.ping()
                ? Health.up().withDetail("region", client.region()).build()
                : Health.down().withDetail("error", client.lastError()).build();
    }
}
```

Each indicator reports `UP`, `DOWN`, `OUT_OF_SERVICE` or `UNKNOWN`, and the aggregate is the worst of them. The
database, the disk space and the connection pools already have one, so a custom indicator is for a dependency
the framework does not know about.

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
      group:
        liveness:
          include: ping
        readiness:
          include: db,ping
```

The Kubernetes probes are the reason for that block. A liveness probe that includes the database makes the
platform restart the service when the database is merely slow, and restarting does not fix a slow database. A
readiness probe that includes the database is correct, because a replica that cannot reach its data should be
taken out of the load balancer.

## Info carries the version

```yaml
spring:
  info:
    build:
      enabled: true
    git:
      enabled: true
```

With the build plugin configured, `/actuator/info` reports the version, the build time and the commit. In an
incident the first question is which version is running, and an endpoint that answers it saves a log search.

## Metrics are counters and histograms

```java
@Service
public class RowService {
    private final Counter created;
    private final Timer lookup;

    public RowService(MeterRegistry registry) {
        this.created = registry.counter("rows.created");
        this.lookup = registry.timer("rows.lookup");
    }

    public Optional<Row> find(String key) {
        return lookup.record(() -> repository.findByKey(key).map(this::toDomain));
    }
}
```

Micrometer is the facade and the registry is the backend, so the same code reports to Prometheus, Datadog or
CloudWatch with a dependency change. A `Counter` only increases, a `Timer` records a duration and a count, and a
`Gauge` reads a value when the registry asks.

```yaml
management:
  prometheus:
    metrics:
      export:
        enabled: true
```

```java
@Timed("rows.create")
public Row create(CreateRowRequest request) { }
```

`@Timed` on a method is shorter than a timer in the body, and it needs a `TimedAspect` bean registered once. The
framework already publishes `http.server.requests` with a timer per route, `jvm.memory.used`, `jvm.gc.pause` and
`hikaricp.connections.active`, which cover most of what a dashboard needs before a single custom meter is
written.

## Labels are the thing to get right

A metric with a label per user identifier, per session or per raw URL path produces a new time series for every
value and takes the monitoring system down. A few labels with low cardinality, such as the method, the status and
the route template, are what a dashboard can aggregate.

```java
registry.counter("rows.created", "level", row.level().name()).increment();
```

An enum or a fixed set of statuses is safe. A key, an identifier or a path with a value in it is not.

## Log levels without a restart

```bash
curl -X POST localhost:8081/actuator/loggers/com.example.tool \
  -H 'Content-Type: application/json' \
  -d '{"configuredLevel":"DEBUG"}'
```

The loggers endpoint changes a level at run time, which is how a problem in production is investigated without a
redeploy and turned back down afterwards. It is also a reason to keep the endpoint off the public interface,
since anyone who can reach it can flood the logs.

## Traces when one service is not enough

```groovy
implementation 'io.micrometer:micrometer-tracing-bridge-otel'
implementation 'io.opentelemetry:opentelemetry-exporter-otlp'
```

A trace follows one request across several services, and the framework instruments the incoming request and the
outgoing HTTP client once the tracer is on the classpath. Sampling decides how many requests are recorded, so the
cost stays bounded. Metrics answer whether anything is wrong, a trace answers where, and a log line answers what
exactly.

## Check yourself

Add the starter, expose health, info and metrics, and read all three. Add a custom counter and a dependency
indicator, then check that a failing dependency turns readiness down and leaves liveness up.
