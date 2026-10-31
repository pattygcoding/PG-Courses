---
title: Where to go next
summary: What the other courses cover, and the sources worth reading to keep up with the compiler.
chapter: Working with the ecosystem
minutes: 12
status: draft
---

## What this course covered

The type system: inference and narrowing, unions and intersections, generics, mapped, conditional and template literal
types, the utility types, and the classes and modules that carry them. The compiler: every flag worth setting, the strict
family, module resolution, the emit and the declaration output. And the practice: modelling a domain, the boundary where
types stop, testing the types, and the ecosystem around a published package.

What it deliberately left out is the runtime language. Nothing in this course changed how a closure captures a variable,
how a promise resolves, or what `===` does with a `NaN`. Those are the JavaScript course, and they are worth knowing in
detail, because every type you write describes the behaviour of that language rather than replacing it.

## The other courses here

- **JavaScript** is the runtime language: coercion, objects and prototypes, closures, the event loop, the standard
  library and the tooling. If any lesson in this course mentioned a behaviour you were not sure about, it is there.
- **React** and **Vue** cover the browser hosts, including the DOM, `fetch` and the reactive model. Both assume you can
  write either JavaScript or TypeScript, and the component types in each are worth reading as examples of the patterns in
  this course.
- **Express** covers the Node host: HTTP, middleware, streams, the process lifetime and deployment.
- **C#**, **.NET**, **Java** and **Spring Boot** cover two other ecosystems with a similar shape, which is the fastest
  way to see which parts of a type system are universal and which are a decision TypeScript made.

## Reading the compiler's own types

The compiler's `lib.es5.d.ts` and its siblings are the definitions of every built-in type, and reading them is how the
utility types in this course were explained. One of them is worth reading in full: `Awaited` is a recursive conditional
with several `infer` positions and several nested branches, and it is the example to study if you want to write types of
that kind. The other is one line:

```ts
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

That single line explains why `Omit<T, K>` accepts a key that is not in `T` while `Pick<T, K>` rejects one.

The declaration files of a library you use are the other source. A library written by somebody who understands the type
system reads as a design document, and hovering the types in your own code is the fastest available way to learn what the
compiler inferred.

## Keeping current

```bash
npm install --save-dev typescript@latest
npx tsc --version
```

The release notes for each version are short and they are the accurate source for what changed, including the changes to
the type system that make previously accepted code an error. Reading them before an upgrade is worth more than reading a
summary afterwards, because the interesting entries are the ones about inference rather than the ones about syntax.

`simplify` and `fix` are the two compiler flags worth knowing for an upgrade: `tsc --generateTrace` for a performance
problem, and the editor's quick fix for a mechanical change across many files. A large migration is a sequence of small
mechanical edits guided by the compiler's own error list, which is the theme of the whole course.

## Practising the patterns

The patterns worth seeking out in real code, because reading one good example is worth three explanations:

- A schema library's types, which are a large body of conditional and mapped types doing something practical.
- A table-driven configuration with `satisfies` and a `Record` over a union of keys.
- A branded type for an identifier, in a codebase that has two kinds of identifier.
- A discriminated union for a state, with an exhaustive switch.
- A library's declaration file, read as a specification.

## The advice I would give

1. **Turn `strict` on in a new project, and turn it on directory by directory in an old one.** Everything else in this
   course is easier once `strictNullChecks` has found the missing values.
2. **Write the type at the boundary and infer inside it.** An annotated parameter and return type on an exported function,
   nothing on the locals.
3. **Model the domain with unions.** A boolean flag and two optional properties is a union that has not been written down.
4. **Validate at the edge.** A schema for every value that arrives from outside, and a name for the function that does the
   validation.
5. **Read the error before working around it.** The `as` that removes an error is the moment a possible bug becomes a run
   time one.
6. **Prefer a simple type and a runtime check to a clever type.** The clever type costs every future reader, and it does
   not check the value anyway.

The last one is the lesson I would put first if I could only teach one. The type system is a tool for describing what the
program does, and a description nobody can read is worse than a shorter one that is slightly less precise.

## Check yourself

Pick a function in a codebase you know that takes four or five parameters and write the signature you would give it today.
Then find one `as` in the same codebase and say what would have to be true for it to be safe.
