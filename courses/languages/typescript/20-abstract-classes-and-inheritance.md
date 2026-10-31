---
title: Abstract classes and inheritance
summary: The keyword, the override check, and the honest argument for composition.
chapter: Classes and values
minutes: 13
status: draft
---

## An abstract class cannot be constructed

```ts
abstract class Sink {
  abstract write(line: string): void;

  writeAll(lines: string[]): void {
    for (const line of lines) {
      this.write(line);
    }
  }
}

new Sink();
```

```text
error TS2511: Cannot create an instance of an abstract class.
```

`abstract` on the class means it is a base for other classes and has no instances. `abstract` on a member means a
subclass must implement it, and the base can call it:

```ts
class MemorySink extends Sink {
  private lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }
}
```

A subclass that leaves the member out is an error at the class:

```text
error TS2515: Non-abstract class 'MemorySink' does not implement inherited
abstract member write from class 'Sink'.
```

The message names the member, which makes it the useful kind of error. That is the shape of a template method: the base
holds the algorithm, the subclass supplies the step.

## override makes the relationship explicit

```json
{
  "compilerOptions": {
    "noImplicitOverride": true
  }
}
```

With that flag on, a method that replaces a base member has to say so:

```text
error TS4114: This member must have an 'override' modifier because it overrides a
member in the base class 'Sink'.
```

It also catches the other direction: an `override` on a method that does not exist in the base is TS4113, which is the
error that appears when the base class renamed a method and the subclass silently stopped overriding anything. That pair
of checks is worth the flag, which is the reason it is in the recommended strict set.

## super goes up one level

```ts
class AuditedSink extends Sink {
  constructor(private readonly label: string) {
    super();
  }

  override write(line: string): void {
    console.log(this.label);
    super.write(line);
  }
}
```

`super(...)` calls the base constructor and must be the first statement that touches `this`. `super.write(line)` calls
the base implementation, which is how an override extends behaviour rather than replacing it.

A class that declares a constructor and does not call `super` is an error, and so is touching a field before `super`
returns, because the base has not initialised the instance yet.

## instanceof narrows an object

```ts
function describe(error: unknown): string {
  if (error instanceof NotFoundError) {
    return error.message;
  }

  return String(error);
}
```

An `instanceof` check narrows to the class, which is how an error type or an event type is handled. It relies on the
prototype chain, so a class from another JavaScript environment or a value built by `Object.create` is not caught, which
is the reason a discriminated union is a more reliable shape for a closed set of types.

## A method returning this keeps the subclass type

```ts
class Builder {
  #limit = 10;

  limit(value: number): this {
    this.#limit = value;
    return this;
  }
}

class RowBuilder extends Builder {
  where(clause: string): this {
    return this;
  }
}

new RowBuilder().where('a').limit(5);
```

Returning `this` rather than `Builder` means the chain keeps the most derived type, so `where` is callable after
`limit` whatever the order. A method returning the base type would lose the subclass and the second call would fail.

## Inheritance costs more than it looks

```ts
class Report extends BaseReport { }
```

A subclass inherits every public and protected member of the base, so a change to the base reaches every subclass at
once. That is the point and it is also the problem: a base class that grows a method changes the API of ten subclasses,
and a protected member is a contract that is expensive to change.

Composition has the opposite property:

```ts
class Report {
  constructor(private readonly formatter: Formatter) {}

  render(): string {
    return this.formatter.format(this.rows);
  }
}
```

The class holds what it needs, publishes only the methods it supports, and a change to `Formatter` reaches only the
classes that call the changed method. My rule is that inheritance is for a genuine subtype with a shared contract, and
a field is for everything else.

A shared implementation with no subtype relationship is the case where an abstract class or a mixin function is the
right answer, and a class that extends a base purely to reuse two methods is where the trouble starts.

## Check yourself

Write an abstract class with one abstract method and one concrete method that calls it, then a subclass that forgets the
abstract member and read the error. Turn on `noImplicitOverride`, add an override, and then rename the base method and
read the second error.
