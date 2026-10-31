---
title: Resources, files and NIO
summary: Closing what you open, and the file API that replaced the old one.
chapter: Errors, resources and diagnostics
minutes: 14
status: draft
---

## AutoCloseable is the hook

```java
public interface AutoCloseable {
    void close() throws Exception;
}
```

`Closeable` is the older subinterface whose `close` throws `IOException`, which is what the file, stream and
socket classes implement. A type that holds an operating system resource implements one of the two, and the
compiler then allows it in the parentheses of a try-with-resources statement.

```java
try (Connection connection = dataSource.getConnection();
     PreparedStatement statement = connection.prepareStatement(sql)) {
    statement.setString(1, key);
    statement.execute();
}
```

Both close, in reverse order, on every path out of the block. A bug in the JDBC classes means a
`PreparedStatement` can hold an open cursor, so closing it explicitly rather than relying on the connection
is the habit worth having.

## A close that fails is suppressed

```java
try (Receiver receiver = new Receiver()) {
    receiver.process();
} catch (Exception e) {
    for (Throwable suppressed : e.getSuppressed()) {
        System.out.println("also failed: " + suppressed);
    }
}
```

When the body throws and `close` also throws, the body's exception is the one propagated and the close
failure is attached to it as a suppressed exception. That is the behaviour the old `finally` block could not
provide, where the second exception replaced the first.

## The file API worth using

```java
Path path = Path.of("data", "input.csv");

String all = Files.readString(path, StandardCharsets.UTF_8);
List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
Files.writeString(path, report, StandardCharsets.UTF_8);
```

`Path.of` replaces the old `Paths.get` and takes components. `Files.readString` and `Files.readAllLines`
open, read and close in one call, which removes the resource handling entirely and is the right choice for
a file that fits in memory.

For a large file, process it as a stream of lines:

```java
try (Stream<String> lines = Files.lines(path, StandardCharsets.UTF_8)) {
    long count = lines.filter(line -> line.startsWith("#")).count();
}
```

That holds one line at a time rather than the whole file, which is the difference between working and not
on a file bigger than the heap.

```java
try (var writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
    for (Row row : rows) {
        writer.write(row.toLine());
        writer.newLine();
    }
}
```

A writer without buffering makes a system call per write, so `newBufferedWriter` is the version to reach
for in a loop. `newBufferedReader` is its counterpart for reading line by line when the loop needs more than
a stream pipeline can express.

## Directories and walking a tree

```java
Files.createDirectories(path.getParent());
Files.list(directory).forEach(System.out::println);
Files.walk(root, 3).filter(Files::isRegularFile).forEach(System.out::println);
```

`Files.createDirectories` makes every missing directory in the path and succeeds when they already exist.
`Files.walk` descends a tree to a depth, and `Files.find` does the same with a filter applied while walking.
Both return a stream holding an open directory handle, so they need a try-with-resources block in a long
running program.

## Bytes and characters are different streams

```java
InputStream in = Files.newInputStream(path);                 // bytes
Reader reader = new InputStreamReader(in, StandardCharsets.UTF_8);   // characters
```

A byte stream reads bytes and knows nothing about text. A reader wraps one and decodes with a named charset,
which is the only place an encoding decision should be made. The same split exists on the way out with
`OutputStream` and `Writer`.

For binary data, `DataInputStream` and `DataOutputStream` give fixed-width primitives in a defined order,
which is what a protocol needs. `ObjectInputStream` serialises Java objects and should be avoided outside a
trusted, version-locked pair of programs, because a class change breaks it and deserialising untrusted data
is a known attack.

## Temporary files

```java
Path temp = Files.createTempFile("report", ".csv");
Files.deleteIfExists(temp);
```

A temporary file created this way has a unique name, which is safer than building one from the current time
in a shared directory. `deleteOnExit` exists and only runs on a normal JVM shutdown, so an explicit delete
in a `finally` block or a try-with-resources is more reliable.

## Check yourself

Read a file into a list, write it back to a temporary file with a different line ending, and confirm the
round trip. Then read a file with `Files.lines` inside a try-with-resources, count the lines, and explain
what stays on disk if you forget the try block.
