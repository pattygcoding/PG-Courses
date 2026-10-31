---
title: Coverage, lints and static analysis
summary: What a coverage number does and does not say, and the checks that keep a large codebase readable.
chapter: Testing and quality
minutes: 13
status: draft
---

## Coverage counts lines that ran

```groovy
plugins {
    id 'jacoco'
}

test {
    useJUnitPlatform()
    finalizedBy jacocoTestReport
}

jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                minimum = 0.80
            }
        }
    }
}
```

JaCoCo instruments the classes during the test run and reports which lines and which branches were reached.
A line that ran is covered; a branch reports both sides separately, so an `if` whose `else` never ran shows as
partially covered.

The number is a diagnostic, not a goal. Sixty percent coverage concentrated on the parsing and the money
arithmetic is worth more than ninety percent spread evenly, and a suite can reach a high number while asserting
almost nothing:

```java
@Test
void runs() {
    service.process(row);           // no assertion
}
```

That test covers the line and would pass if the method returned garbage. Mutation testing is the tool that
answers the question coverage cannot.

## The build can enforce a floor

```bash
./gradlew test jacocoTestCoverageVerification
```

A threshold that fails the build stops a change from lowering coverage, which is worth having once the suite
is in reasonable shape. Setting one before that produces a build that fails for reasons nobody believes in,
and it gets disabled.

Exclude the generated code, the configuration classes and the `main` method from the rule, or the number is
about classes nobody tests by design and stops meaning anything.

## Mutation testing asks a better question

```groovy
plugins {
    id 'info.solidsoft.pitest' version '1.15.0'
}

pitest {
    targetClasses = ['com.example.tool.*']
    mutationThreshold = 70
}
```

PIT changes the code in small ways, such as flipping a `<` to a `<=` or removing a call, and reports the
changes the test suite did not notice. A mutation that survives is a line the tests execute without checking,
which is exactly the gap a coverage number hides. It is slow, so it runs on a schedule or on the packages that
matter rather than on every build.

## Compiler warnings are free checks

```groovy
tasks.withType(JavaCompile).configureEach {
    options.compilerArgs += ['-Xlint:all', '-Werror']
    options.encoding = 'UTF-8'
}
```

`-Xlint:all` turns on the warnings the compiler has, including unchecked casts, deprecation and a `switch` over
an enum with no `default`. `-Werror` makes them failures, which is the only way they get fixed: a warning that
is allowed to accumulate is read by nobody. Adding `-Werror` to an existing project means fixing the warnings
first, and a common approach is to do it one package at a time.

## Static analysis

| Tool | Finds |
| --- | --- |
| SpotBugs | likely bugs: null dereference, ignored return, bad equals |
| PMD | dead code, unused fields, complexity |
| Error Prone | bugs at compile time, replacing the javac analysis |
| Checkstyle | formatting and naming conventions |
| ArchUnit | architecture rules expressed as tests |
| NullAway | null dereferences, using the annotations you wrote |

```java
@ArchTest
static final ArchRule servicesDoNotDependOnWeb =
        noClasses().that().resideInAPackage("..service..")
                .should().dependOnClassesThat().resideInAPackage("..web..");
```

ArchUnit is the one worth adding early: a layering rule that holds for a year is easier to keep than a
layering rule in a wiki. It fails the build with the offending class named, which turns a design decision into
a test.

Start with the compiler warnings and one analyser. A project that enables five tools at once gets a thousand
findings, disables the lot, and learns nothing.

## A gate that runs in a minute

```bash
./gradlew clean build
```

The whole gate should be: compile with warnings as errors, run the tests, verify coverage, run the analysers,
and produce the artifact. Keeping that under a few minutes is what makes it possible to run before every push,
and a build nobody runs is a build that does not protect anything.

## Check yourself

Add `-Xlint:all -Werror` to a project and fix what it reports. Then turn on a coverage rule, run a task that
adds a method with no test, and confirm the build fails.
