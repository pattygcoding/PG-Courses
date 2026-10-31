---
title: Toolchains and versions
summary: Which release to install, how to hold several at once, and how to target an older one.
chapter: Getting started
minutes: 12
status: draft
---

## Pick an LTS release

Java ships a feature release every six months and marks a long term support release every two years. The
LTS releases in use today are 8, 11, 17, 21 and 25. Production code should be on an LTS unless a feature
release has something you need, because a non-LTS release stops receiving updates after six months.

Newer is the better default: the garbage collectors improved, records, sealed types and pattern matching
arrived, and virtual threads landed in 21.

```bash
java --version
javac --version
```

Both should print the same release. A mismatch means `PATH` finds one JDK's launcher and another one's
compiler, which produces confusing errors.

## Distributions

Several companies build a JDK from the same OpenJDK source, and they differ in licence and support:

| Distribution | Notes |
| --- | --- |
| Eclipse Temurin | the common default, free, built by the Adoptium project |
| Amazon Corretto | free, tested by Amazon, long support windows |
| Azul Zulu | free, wide platform coverage |
| Microsoft Build of OpenJDK | free, good Windows and Azure support |
| Oracle JDK | free for development, a paid licence for some production use |

Pick one and install it the way your platform prefers: `brew install temurin`, `sdk install java`,
`apt install temurin-21-jdk`, or a package manager on Windows. What matters is that a new machine can be
set up from a written command rather than from memory.

## Several versions at once

```bash
sdk list java
sdk install java 21.0.5-tem
sdk use java 21.0.5-tem
echo $JAVA_HOME
```

`JAVA_HOME` is the variable most tools read to find the JDK that matters, so setting it alongside `PATH`
keeps Maven, Gradle and the IDE on the same release. A directory such as `~/.sdkman/candidates/java/current`
that points at the active install is the trick that keeps `JAVA_HOME` from being edited on every switch.

## Target an older release

```bash
javac --release 17 -d out/classes src/Tool.java
```

`--release 17` compiles against the Java 17 API and emits a class file version that a Java 17 JVM
accepts. It fails when you call a method added in 21, which is the point: the alternative, compiling with
a newer JDK and running on an older JVM, fails at run time instead.

```text
error: cannot find symbol
  symbol: method toList()
```

That error from `--release 17` is describing a method added in 16, or 21 for a different one, and the fix
is either to raise the target or to write the code the older API supports.

## A REPL for trying things

```bash
jshell
```

```text
jshell> var names = List.of("ada", "grace");
names ==> [ada, grace]
jshell> names.stream().map(String::toUpperCase).toList()
$2 ==> [ADA, GRACE]
```

`jshell` evaluates expressions with the full standard library available, which makes it the quickest way
to check how a method behaves or what an exception message looks like. Snippets that work move into a
test or into the code.

## Check yourself

Print `java --version`, install an LTS release if you have none, and switch `JAVA_HOME` between two
releases with whatever tool you chose. Then compile one file with `--release` set to an older release and
read the error it gives for a method that does not exist there.
