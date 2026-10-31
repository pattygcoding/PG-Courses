---
title: What Spring Boot is
summary: The container, the starters and the auto-configuration that decides most of your application for you.
chapter: Getting started
minutes: 13
status: draft
---

## Spring is a container, Boot is a way to start one

Spring's core idea is that your objects do not construct their own dependencies. You describe them, and a
container builds them, wires them together and manages their lifetime. That container is the
`ApplicationContext`, and almost everything else in the framework is built on it.

Spring Boot adds three things on top:

- **Starters**, which are dependency bundles for a common job, such as a web service with JSON.
- **Auto-configuration**, which inspects the dependencies on the classpath and configures them.
- **An embedded server**, so the application is a jar that runs rather than a war deployed into something.

## A whole application in one class

```java
@SpringBootApplication
public class ToolApplication {
    public static void main(String[] args) {
        SpringApplication.run(ToolApplication.class, args);
    }
}
```

`@SpringBootApplication` is three annotations together: `@Configuration`, so the class can declare beans,
`@EnableAutoConfiguration`, which runs the auto-configurers, and `@ComponentScan`, which finds the classes in
this package and below.

That last part is worth remembering: the scan starts at the package of the annotated class. A class placed in
a sibling package is invisible to the scan, and the error is a missing bean rather than a compile failure.

## Auto-configuration is conditional

```java
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
@ConditionalOnMissingBean(DataSource.class)
public class DataSourceAutoConfiguration {
    @Bean
    @ConditionalOnProperty("spring.datasource.url")
    DataSource dataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }
}
```

Read that as a sentence: configure a `DataSource` when the class is on the classpath and you have not defined
one, and only when a URL is set. Every auto-configurer is written that way, which is why adding a starter
gives you working defaults and why defining your own bean overrides them.

```bash
java -jar tool.jar --debug
```

The `--debug` flag prints the auto-configuration report, with the ones that applied and the ones that were
skipped and why. That report is the first place to look when a bean is missing or a default is not what you
expected.

## What arrives with the web starter

```groovy
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
}
```

That one line brings in Spring MVC, an embedded Tomcat, Jackson for JSON, validation, and the logging facade
that everything else uses. Starting the application serves on port 8080 with no further configuration, which
is the effect of auto-configuration plus sensible defaults.

A starter is a dependency declaration, not code. It exists so that a project describes intent, and so that
the versions of thirty transitive dependencies are decided once, by the Boot release, rather than by you.

## Spring Boot 3 needs Java 17

The current line is Spring Boot 3, which requires Java 17 or later and uses the `jakarta.*` package names
rather than the older `javax.*`. Code written for Spring Boot 2 with `javax.validation` imports does not
compile against Boot 3, and the fix is an import change rather than a behavioural one. Jakarta EE 9 renamed
the namespace as part of the transition from Oracle to the Eclipse Foundation, and Boot 3.0 moved with it.

## Check yourself

Generate a project with the web starter, run it, and read the auto-configuration report from `--debug`. Then
find in the report one auto-configurer that did not apply and the condition that stopped it.
