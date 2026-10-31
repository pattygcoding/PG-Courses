---
title: Starting a project
summary: The initialiser, the wrapper, the layout and the settings file that starts empty and does not stay that way.
chapter: Getting started
minutes: 12
status: draft
---

## Generate rather than assemble

A Spring Boot project begins at `start.spring.io`, which produces a zip with the build file, the wrapper, the
application class, a settings file and a test. Choose the dependencies by their starter names: Web, Validation,
Data JPA, PostgreSQL Driver, Flyway Migration, Actuator, Testcontainers.

The generator is worth using over a hand written `pom.xml` because the versions are chosen together. A Boot
release defines a set of dependency versions that are tested with each other, which is what
`spring-boot-dependencies` is, and picking versions by hand is how a project ends up with a Hibernate that
disagrees with its JPA API.

## The layout

```text
tool/
  build.gradle
  settings.gradle
  src/
    main/
      java/com/example/tool/ToolApplication.java
      resources/application.yml
    test/
      java/com/example/tool/ToolApplicationTests.java
```

Resources on the classpath include `application.yml` or `application.properties`, plus
`static/` for files served directly and `templates/` for server rendered views. A web service that returns
JSON uses none of the last two.

## The build file

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.4.1'
    id 'io.spring.dependency-management' version '1.1.6'
}

group = 'com.example'
version = '0.1.0'

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'

    runtimeOnly 'org.postgresql:postgresql'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.testcontainers:postgresql'
    testImplementation 'org.testcontainers:junit-jupiter'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

No versions appear on the dependencies, because the Boot plugin supplies them. That is the property worth
protecting: a version written in the build file is a version that can disagree with the rest.

`spring-boot-starter-test` brings JUnit 5, AssertJ, Mockito, JSONassert and Hamcrest, along with the Spring
test framework. Adding JUnit to a Boot project separately is how two test engines end up on the classpath.

## Run it

```bash
./gradlew bootRun
```

```text
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.4.1)

2024-12-05T09:14:02.113Z  INFO 41822 --- [tool] [main] c.e.tool.ToolApplication
  : Starting ToolApplication with PID 41822
2024-12-05T09:14:02.998Z  INFO 41822 --- [tool] [main] o.s.b.w.embedded.tomcat.TomcatWebServer
  : Tomcat started on port 8080 (http) with context path ''
```

The banner is decoration, and the two lines worth reading are the application name with its profile and the
line naming the port. A start that hangs is usually a bean that needs a database, which the `--debug` report
or the stack trace names.

## application.properties or application.yml

```yaml
spring:
  application:
    name: tool
  datasource:
    url: jdbc:postgresql://localhost:5432/tool
    username: tool
    password: ${TOOL_DB_PASSWORD}
```

Both formats are read, and YAML is the more readable once nested settings appear. The file is for
configuration that is the same everywhere; anything that differs between environments belongs in a profile,
which the configuration chapter covers.

```properties
spring.application.name=tool
server.port=8081
logging.level.com.example.tool=DEBUG
```

Property names are the ones in the Boot documentation, and the IDE completes them from the metadata the
starters publish. Setting a property that nothing reads fails silently, which is why the metadata completion
is worth having.

## Check yourself

Generate a project with the web and actuator starters, run it with the wrapper, and call two of the actuator
endpoints. Then change the port in `application.properties` and confirm the startup line reports the new one.
