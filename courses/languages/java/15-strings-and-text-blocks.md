---
title: Strings and text blocks
summary: Immutable text, why concatenation in a loop hurts, and the Java 15 text block.
chapter: Objects and data
minutes: 13
status: draft
---

## String is immutable and interned

```java
String literal = "ada";                    // from the constant pool
String built = new String("ada");           // a new object every time

System.out.println(literal == built);             // false
System.out.println(literal == built.intern());    // true
```

Every operation that looks like a change returns a new string:

```java
String text = "hello";
text.toUpperCase();
System.out.println(text);          // hello, the call changed nothing
text = text.toUpperCase();          // now it is HELLO
```

The pool means identical literals share one object, which is why `==` appears to work on them and fails as
soon as a string is built at run time. Compare with `equals` always.

## Concatenation in a loop allocates

```java
String result = "";
for (String part : parts) {
    result += part;                 // a new string per iteration
}
```

Each `+=` builds a new string and copies the previous contents, so a thousand iterations copy about half a
million characters. A single expression concatenating several values is compiled into one `StringBuilder`
and is fine. A loop is not:

```java
StringBuilder builder = new StringBuilder(parts.size() * 16);
for (String part : parts) {
    builder.append(part);
}
String result = builder.toString();
```

Give the builder an initial capacity where you can estimate it, and use `StringBuilder` rather than
`StringBuffer`, which synchronises every call for a case that almost never applies.

## The methods you will use most

```java
String line = "  key=value  ";

String trimmed = line.strip();                  // Unicode aware
String[] parts = trimmed.split("=", 2);
boolean empty = trimmed.isEmpty();
boolean blank = "   ".isBlank();                 // true
String joined = String.join(",", "a", "b");
String formatted = "%s=%d".formatted("size", 12);
String repeated = "-".repeat(8);
```

`strip` understands Unicode whitespace and `trim` only the characters below U+0020, so `strip` is what you
want on text from outside your program. `split` takes a regular expression, which is why splitting on
`"."` with no escaping returns an empty array; use `Pattern.quote(".")` or the literal-aware helper.

`replace` works on literal text, `replaceAll` and `matches` take a regex and rebuild the pattern on every
call. Compile the pattern once when it is used repeatedly:

```java
private static final Pattern NUMBER = Pattern.compile("[0-9]+");

Matcher matcher = NUMBER.matcher(line);
```

## Text blocks hold multi line text

```java
String query = """
        select id, name
        from rows
        where size > ?
        """;
```

A text block starts with `"""` and a line break, and ends with `"""`. The common leading whitespace is
removed, so the indentation of the closing delimiter decides how much is kept. Inside a block, `\` at the
end of a line joins it to the next, `\s` keeps a trailing space, and `%s` with `formatted` interpolates.

This is the reason to use a text block over a concatenation of quoted lines: the value is readable in the
source in the shape it will have at run time.

## Characters, code points and length

```java
String emoji = "a\uD83D\uDE00";
System.out.println(emoji.length());          // 3, UTF-16 units
System.out.println(emoji.codePointCount(0, emoji.length()));   // 2, characters
```

`length()` counts UTF-16 units, so a character outside the basic plane counts as two. `charAt` returns a
unit rather than a character, and `substring` can cut one in half. Iterate code points for text that may
contain anything, and use `codePointCount` when you need a character count.

## Encoding

```java
byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
String back = new String(bytes, StandardCharsets.UTF_8);
```

The no-argument versions use the platform default charset, which differs between machines and turns a
working program into a corrupted file on someone else's. Name the charset at every conversion. For a
password or a key, keeping the value in a `char[]` rather than a `String` allows it to be wiped, since a
string stays in the pool until it is collected.

## Check yourself

Concatenate ten thousand strings in a loop, then repeat with a `StringBuilder`, and print the elapsed time
for each. Then write a multi line SQL string as a text block and confirm the indentation is stripped by
printing it between markers.
