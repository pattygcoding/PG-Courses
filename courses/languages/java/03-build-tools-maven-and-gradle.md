---
title: Build tools, Maven and Gradle
summary: Dependency declarations, the standard lifecycle, and how to pick between the two.
chapter: Getting started
minutes: 14
status: draft
---

## What a build tool does

It downloads dependencies, compiles, runs tests, packages, and does the same thing on a colleague's
machine as on the build server. Java has two that matter: Maven, which describes a build in XML, and
Gradle, which describes it in Groovy or Kotlin. Both are wrappers around the same idea.

## Maven

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.example</groupId>
  <artifactId>tool</artifactId>
  <version>0.1.0</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.0</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>
```

The three values at the top are the coordinates that identify the artifact, and a dependency names
another artifact the same way. `scope` decides when the dependency is on the classpath:

| Scope | On the classpath for |
| --- | --- |
| `compile` | compiling and running, the default |
| `provided` | compiling only, because the runtime supplies it |
| `runtime` | running only, such as a JDBC driver |
| `test` | compiling and running tests only |

Getting the scope right keeps a driver out of the compile path where it would tempt someone to import it.

## Gradle

```groovy
plugins {
    id 'java'
    id 'application'
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

application {
    mainClass = 'com.example.Tool'
}

dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter:5.11.0'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

test {
    useJUnitPlatform()
}
```

The `toolchain` block asks Gradle to find or download a JDK 21 rather than using whatever `JAVA_HOME`
points at, which removes a whole class of "works on my machine" failures. The dependency configurations
read as `implementation` and `testImplementation` rather than as a scope attribute.

## The wrapper

```bash
./mvnw -q verify
./gradlew build
```

Commit the wrapper. It pins the build tool version in the repository, so a machine with no Maven or
Gradle installed can still run the build, and everyone gets the same version without a setup step.

## The lifecycle

Both tools have the same shape, spelled differently:

| Step | Maven | Gradle |
| --- | --- | --- |
| Compile the main sources | `mvn compile` | `gradlew classes` |
| Run the tests | `mvn test` | `gradlew test` |
| Build the jar | `mvn package` | `gradlew jar` |
| Everything the build means | `mvn verify` | `gradlew build` |

`verify` and `build` are the ones to wire into continuous integration, because they run the plugins a
project has configured rather than only compiling and testing.

## Choosing between them

Match the repository you are joining. Moving a working project from one to the other buys nothing and
costs a week. For a new project, either works: Maven is more declarative and easier to read as data,
Gradle runs faster on large multi-module builds and its Kotlin DSL gives you real type checking. I pick
Gradle when the build has logic in it and Maven when it does not.

## Check yourself

Create a project with the wrapper, add one test scoped dependency, and run the full lifecycle command.
Then check where the dependency was cached and confirm a second build with no network still passes.
