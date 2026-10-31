---
title: Project layout and packages
summary: The standard directories, package naming that survives a rename, and the visibility level nobody uses enough.
chapter: Getting started
minutes: 12
status: draft
---

## The directories both tools expect

```text
tool/
  build.gradle
  src/
    main/
      java/com/example/tool/Tool.java
      resources/logging.properties
    test/
      java/com/example/tool/ToolTest.java
      resources/sample.csv
```

`src/main/java` holds shipped code, `src/test/java` holds test code compiled against it, and the two
`resources` directories hold files loaded from the classpath rather than from a path on disk. The layout
is convention, so both build tools find everything with no configuration, and every Java developer who
joins can navigate the repository on the first day.

## Packages are directories with names

```java
package com.example.tool.parse;

import java.nio.file.Path;
import java.util.List;

public final class CsvParser { }
```

The package name matches the directory, and the first statement of the file is the `package` line. The
convention is a reversed domain name, all lowercase, with no underscores. A file in no package at all
(the default package) cannot be imported by anything else, so the compiler warns when you are about to
add one.

Group by what the code does rather than by which framework class it extends. `tool.parse`, `tool.report`
and `tool.cli` tell a reader more than `tool.model`, `tool.service` and `tool.util`. The `util` package
is the one to avoid, because it becomes the place everything goes and nothing belongs.

## Four levels of visibility, and the useful third one

```java
public class Report {            // visible everywhere
    private final List<Row> rows;      // this file only

    protected String title() { ... }   // this package and subclasses

    void summary() { ... }             // this package only
}
```

The level with no keyword is package-private, and it is the one worth reaching for when two classes
collaborate closely and nothing outside the package should call either. It is stronger than `public` and
weaker than `private`, and a package full of package-private classes has a boundary you can see.

## One public type per file

A file may hold several top level types, but only one can be public and the file has to be named after
it. Nested types belong inside the class they serve:

```java
public final class CsvParser {
    public record Row(String key, long value) { }

    private static final class Cursor { }
}
```

A nested class marked `static` has no reference to an enclosing instance, which is what you want for a
helper. A nested class without `static` carries a hidden pointer to the object that created it, which
keeps that object alive for as long as the nested instance lives.

## The module system, briefly

```java
module com.example.tool {
    requires java.logging;
    exports com.example.tool.api;
}
```

A `module-info.java` at the source root names what the module needs and what it publishes. The JDK itself
is modular and `java.base` is in every module. Most applications skip modules entirely and stay on the
classpath, which keeps the build simpler. Reach for them when you want a hard boundary that the compiler
enforces between parts of a large system.

## Check yourself

Move a class into a subpackage, make one of its methods package-private, and confirm a class in another
package cannot call it. Then add a `src/main/resources` file and load it with
`getClass().getResourceAsStream("/name")`.
