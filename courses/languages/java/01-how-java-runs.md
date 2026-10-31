---
title: How Java runs your code
summary: Compilation to bytecode, what the JVM does with it, and the two commands that matter.
chapter: Getting started
minutes: 12
status: draft
---

## Compile, then run

```java
public class Tool {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.err.println("usage: tool <file>");
            System.exit(2);
        }

        System.out.println("reading " + args[0]);
    }
}
```

```bash
javac -d out/classes src/Tool.java
java -cp out/classes Tool data/input.csv
```

```text
reading data/input.csv
```

`javac` writes `Tool.class`, which is bytecode rather than machine code. `java` starts a JVM, loads the
class and runs `main`. The JVM is what makes a compiled program portable: the same `.class` file runs on
any platform that has a JVM for its architecture.

## What happens between `java` and your first line

1. The class loader finds and loads `Tool` from the classpath.
2. The verifier checks the bytecode against the rules, including the type checks already done at compile
   time. A hand edited `.class` file is rejected here.
3. The interpreter starts running the bytecode.
4. Methods that are called often get compiled to machine code by the JIT compiler, while the program
   runs.

Steps 1 and 3 are why a Java program takes tens of milliseconds to start, which is slow next to a Go
binary and fast next to most things a service does. Step 4 is why the same program gets faster over its
first few thousand requests, which matters when you benchmark it.

## JDK, JVM and JRE

| Term | What it is |
| --- | --- |
| JVM | the runtime that executes bytecode |
| JRE | a JVM plus the standard library, for running but not compiling |
| JDK | a JRE plus `javac` and the tools, for building |

Install a JDK. The JRE as a separate distribution stopped being offered after Java 8, and the modern
replacement is `jlink`, which builds a trimmed runtime image containing only the modules you use.

## Where the portability stops

The bytecode is portable. Everything your program touches outside it may not be. A native library loaded
through JNI, a file path with a separator, a default charset and a time zone all behave differently on
another platform, and each one has bitten a project that assumed otherwise.

## Single file programs skip the manual step

```bash
java src/Tool.java data/input.csv
```

Java 11 and later compile and run one file in a single command, which is enough for a scratch program.
A project with more than one file needs a build tool, which the next two pages cover.

## Check yourself

Write the class above, compile it into `out/classes`, and run it with and without an argument. Then print
`args.length` and check the exit code with `echo $?` after running it with no arguments.
