---
title: Configuration, profiles and secrets
summary: One artifact configured per environment, and the values that must not sit in the repository.
chapter: Configuration and security
minutes: 13
status: draft
---

## A profile changes the settings

```yaml
# application.yml
spring:
  application:
    name: tool

---
spring:
  config:
    activate:
      on-profile: local
  datasource:
    url: jdbc:postgresql://localhost:5432/tool

---
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: ${TOOL_DB_URL}
    hikari:
      maximum-pool-size: 20
```

```bash
java -jar tool.jar --spring.profiles.active=prod
```

One document per environment in one file, or separate files named `application-prod.yml`. The profile selects
which of the sections applies, and everything else is shared.

The same mechanism works at the level of a bean:

```java
@Configuration
@Profile("local")
public class LocalDataConfiguration {
    @Bean
    DataSource dataSource() {
        return new EmbeddedDatabaseBuilder().setType(H2).build();
    }
}
```

A bean marked with a profile exists only when that profile is active, which is how a local stub replaces a real
client without a condition inside the production class.

## Command line beats the file

The lookup order, later winning, is:

1. `application.yml` on the classpath.
2. `application-{profile}.yml`.
3. Environment variables.
4. System properties.
5. Command line arguments, such as `--server.port=8081`.
6. `@SpringBootTest(properties = ...)` in a test.

An environment variable maps to a property by upper casing and replacing the dots with underscores, so
`spring.datasource.url` is read from `SPRING_DATASOURCE_URL`. That is what lets one image be deployed to three
environments with the settings supplied by the platform, and it is the reason a build should not bake an
environment into an artifact.

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/tool java -jar tool.jar
```

## Secrets do not belong in git

```yaml
spring:
  datasource:
    password: hunter2            # in the repository, in every clone, for ever
```

A password in a settings file reaches every clone, every fork and every backup, and removing it later does not
remove it from the history. Four places a secret can live instead:

| Where | Note |
| --- | --- |
| Environment variables | from the platform's secret store, injected at start |
| A mounted file | read with `spring.config.import=optional:file:/run/secrets/db` |
| A secrets manager | fetched at start or on rotation, with the SDK |
| Vault or a config server | a service the application asks for settings |

```yaml
spring:
  config:
    import: optional:configtree:/run/secrets/
```

The `configtree` importer reads each file in a directory as a property named after the file, which is how a
Kubernetes secret becomes `spring.datasource.password` with no code.

## Fail fast on a missing setting

```java
@ConfigurationProperties(prefix = "tool.db")
@Validated
public record DbProperties(
        @NotBlank String url,
        @NotBlank String username,
        @NotBlank String password) {
}
```

A missing setting that binds to a required component fails the start with the property name, which is a
thousand times better than a first request failing with a null pointer. That is the reason to bind settings
into a typed object rather than reading them with `@Value` in five places.

## Do not log the settings

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info
```

The actuator's `env` and `configprops` endpoints print every property, including the datasource password and any
token in the file. Expose `health` and `info`, and add others deliberately rather than with a wildcard.

```java
@ConfigurationProperties(prefix = "tool.db")
public record DbProperties(String url, String username, @ToString.Exclude String password) {
}
```

Excluding the field from `toString` is the small habit that stops a password reaching a log line when someone
prints the properties object while debugging.

## Refresh without a restart

```java
@RefreshScope
@Service
public class PricingService { }
```

A bean in the refresh scope is rebuilt when the environment changes, which is how a setting can be updated
without a redeploy. Without a config server the simpler answer is a redeploy: an artifact that reads its
settings at start is easier to reason about than a running system whose configuration changes underneath it.

## Check yourself

Add a `prod` profile with a datasource URL from an environment variable, start the application with the profile
active, and confirm the value took effect. Then add a required property with validation, remove it, and read the
start-up failure.
