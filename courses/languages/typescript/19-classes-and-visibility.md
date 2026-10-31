---
title: Classes and visibility
summary: The modifiers the compiler checks, the one the runtime checks, and the fields that emit code.
chapter: Classes and values
minutes: 13
status: draft
---

## A class with typed members

```ts
class Store {
  private readonly rows = new Map<string, Row>();

  constructor(public readonly name: string) {}

  add(row: Row): void {
    this.rows.set(row.key, row);
  }

  get count(): number {
    return this.rows.size;
  }
}
```

`private` on a field and `readonly` on both, a constructor parameter property that declares, assigns and types `name` in
one line, and a getter with a return type. All four are TypeScript additions to a class body.

```js
class Store {
    name;
    rows = new Map();
    constructor(name) {
        this.name = name;
    }
    add(row) {
        this.rows.set(row.key, row);
    }
    get count() {
        return this.rows.size;
    }
}
```

The parameter property emits an assignment and a field declaration, which is one of the four constructs that is not
erased. That is why a runtime that only strips annotations refuses it.

## private is checked and not enforced

```ts
class Store {
  private rows: Row[] = [];
}

const store = new Store();

store.rows;
```

```text
error TS2341: Property 'rows' is private and only accessible within class 'Store'.
```

The error is at compile time and the property is still there in the emitted JavaScript, which means anything outside the
type system can reach it. That is fine when the boundary is your own code and not fine when it is a plugin, a test that
pokes at internals, or a serialiser that walks every own property.

```ts
class Store {
  #rows: Row[] = [];
}

const store = new Store();

store.#rows;
```

```text
error TS18013: Property '#rows' is not accessible outside class 'Store' because it has
a private identifier.
```

The `#` form is the runtime private field from JavaScript, so it is enforced outside the compiler: not on the instance,
not in `Object.keys`, and a `Proxy` cannot see it. The trade is that a `#` field cannot be reached by a subclass, which
is the point, and that a test cannot read it either.

| Modifier | Checked by | Visible to a subclass | In the emitted code |
| --- | --- | --- | --- |
| `private` | the compiler | no | yes |
| `#name` | the runtime | no | yes, as a private field |
| `protected` | the compiler | yes | yes |
| `readonly` | the compiler | yes, for writing only | yes |

`readonly` on a field stops assignment outside the constructor, which is the modifier to use for a value fixed at
construction. It is a compile-time promise like the rest.

## protected and inheritance

```ts
class Base {
  protected build(): string {
    return 'base';
  }
}

class Extended extends Base {
  render(): string {
    return this.build().toUpperCase();
  }
}
```

`protected` is visible to subclasses and not to callers, which is where a hook that a subclass overrides belongs. It is
also the modifier that makes a class harder to change, because every subclass depends on it, so a `protected` member is
part of the contract.

## Field initialisation order

```ts
class Base {
  label = this.build();
  build(): string {
    return 'base';
  }
}

class Extended extends Base {
  override build(): string {
    return 'extended';
  }
}
```

```text
extended
```

Fields are initialised after the base constructor runs and before the subclass fields. A method called from a field
initialiser is the fully overridden one, so a subclass can be observed in a state where its own fields are not set yet.
That is the same trap as calling an overridable method from a constructor, and the fix is the same: do not do it.

`useDefineForClassFields` decides whether a field is created with `Object.defineProperty` semantics or assigned, which
matters for a field that shadows an accessor on the prototype. It is on by default for a modern target, and it is the
reason a field declaration without an initialiser clears an inherited accessor rather than leaving it alone.

## static members are typed on the class

```ts
class Level {
  static readonly QUIET = 'quiet';
  static parse(value: string): Level { }
}
```

A static member is on the constructor rather than on an instance, so it appears in `typeof Level` and not in `Level`. That
is why a factory is written as a static method: the value has the constructor type.

```ts
function build(ctor: typeof Store): Store {
  return new ctor('a');
}
```

A parameter typed `typeof Store` accepts the class itself, which is how a factory, a registry or a container takes a
class rather than an instance.

## declare fields

```ts
class Store {
  declare rows: Row[];
}
```

`declare` says the field exists, is typed here, and should not emit a declaration or an assignment. It is for a field
the runtime or a subclass provides, and it is the type-level way to describe a class whose fields are created elsewhere.

## Check yourself

Write a class with one `private` field and one `#` field, then try to read both from outside and record the two errors.
Compile the file and find both in the JavaScript. Finally add a `protected` method and override it in a subclass.
