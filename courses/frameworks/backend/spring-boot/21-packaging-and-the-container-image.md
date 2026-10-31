---
title: Packaging and the container image
summary: The executable jar, layers that cache, and the JVM flags a container needs.
chapter: Packaging and deployment
minutes: 13
status: draft
---

## The executable jar

```bash
./gradlew bootJar
java -jar build/libs/tool-0.1.0.jar
```

The `bootJar` task produces a jar containing your classes, every dependency and a launcher, so `java -jar` starts
the application with an embedded server and no external container. That single file is the artefact, which is what
makes a deploy a file copy rather than an installation.

## Layers make the image cache work

```groovy
tasks.named('bootJar') {
    layered {
        enabled = true
    }
}
```

```bash
java -Djarmode=layertools -jar build/libs/tool-0.1.0.jar list
java -Djarmode=layertools -jar build/libs/tool-0.1.0.jar extract
```

The jar is split into layers that change at different rates: the dependencies, the snapshot dependencies, the
application classes and the loader. Copying them in that order means a change to one class invalidates one layer,
and the dependency layer is reused from the cache. Without layers, every build pushes the whole hundred megabytes.

## Buildpacks build the image for you

```bash
./gradlew bootBuildImage --imageName=registry.example.com/tool:0.1.0
```

```groovy
tasks.named('bootBuildImage') {
    environment = ['BPE_JAVA_TOOL_OPTIONS': '-XX:MaxRAMPercentage=75']
    runImage = 'paketobuildpacks/ubuntu-noble-run'
}
```

Boot can build an OCI image with no Dockerfile, using the buildpacks project to inspect the jar, choose a base
image, create a non-root user and set an entry point that knows how to run a Boot application. It needs Docker
locally and produces a good default image, which is the shortest path from a jar to something a platform can run.

## Or write the Dockerfile

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon
COPY src ./src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
RUN useradd --system --uid 1001 spring
COPY --from=build /src/build/libs/tool-0.1.0.jar app.jar
USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
```

The build stage has the JDK and the sources, and the runtime stage has a JRE and one jar. Copying the build files
and running `dependencies` before copying the sources puts the dependency download in a layer that only changes
when the build file does, which is the same caching idea as the jar layers.

The runtime image has no shell and no package manager beyond what the base provides, and it runs as a non-root
user. Both reduce what an attacker can do with a foothold, and both are cheap if they are decided at the start.

## The JVM and the container limit

```dockerfile
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
```

The JVM reads the container's memory limit rather than the host's and sizes the heap from it, which has been the
default since Java 10. A percentage leaves room for what the heap does not cover: the metaspace, the thread
stacks, the code cache and the buffers the JVM allocates outside it. Setting 75 percent of a 1 GB limit is 750 MB
of heap, and the rest is what keeps the process from being killed for exceeding the limit.

Setting `-Xmx` from the host's memory is the mistake that makes a service run well on a developer machine and get
killed in a container.

## A native image as an option

```bash
./gradlew nativeCompile
```

Ahead of time compilation produces a native binary with a start time in the tens of milliseconds and a memory
footprint a fraction of the JVM's. Boot supports it and generates the configuration the compiler needs for
reflection, proxies and resources. The costs are real: a build measured in minutes rather than seconds, peak
throughput lower than a warmed JVM, and a library without support for it that blocks the whole attempt.

Choose it for a command line tool, a serverless function or an autoscaling service where start time dominates. A
long running service with steady traffic does not gain enough to pay for the build.

## Check yourself

Build the executable jar, list its layers, and write a Dockerfile that copies them in order. Then build the image
twice with one class changed and confirm the dependency layer came from the cache.
