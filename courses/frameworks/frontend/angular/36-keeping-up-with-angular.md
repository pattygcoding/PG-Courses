---
title: Keeping up with Angular
summary: The update command, the support policy it follows, and the habit that keeps a codebase close to current.
chapter: Shipping
minutes: 11
status: draft
---

## The version numbers mean what they say

Angular uses semantic versioning, and the reference page states the promise each level makes:

| Level | What it contains |
| --- | --- |
| major | significant features and breaking changes, with migrations where possible |
| minor | smaller features, backward compatible, no work expected |
| patch | bug fixes only |

Since v7 the major versions of `@angular/core` and the CLI are aligned, so a project's `@angular/cli` and
`@angular/core` should be on the same major. A mismatch is the cause of the "the CLI and core versions
are not compatible" message, and the fix is an update rather than a flag.

Two labels are outside the policy, and they are worth recognising in release notes: **Developer
Preview** APIs are complete but may change before they stabilise, and **Experimental** APIs may change
at any time, including in a patch release. `httpResource` and signal forms arrived as stable APIs;
`provideCheckNoChangesConfig` is a developer preview, which is why the performance page calls it out.

## The update command

```bash
ng update @angular/core @angular/cli
```

`ng update` resolves the target versions, runs the migrations that ship with them, and updates the
dependency ranges. The flags worth knowing, from its own help:

| Flag | Effect |
| --- | --- |
| `--allow-dirty` | update even when the working tree has changes that are not committed |
| `-C`, `--create-commits` | commit the update and each migration separately |
| `--force` | ignore peer dependency mismatches |
| `--migrate-only --from --to` | run a migration without changing versions |

The default refusing to run on a dirty tree is a feature. A migration rewrites code, and a migration on
top of uncommitted work is a merge conflict with yourself, so commit first and let the update be its own
commit. `--create-commits` is the version I use on a project I do not know well, because each migration
lands separately and a broken one can be reverted on its own.

The supported path is one major at a time:

```text
ng update @angular/core@21 @angular/cli@21
ng update @angular/core@22 @angular/cli@22
```

Updating across two majors in one command is not supported, and the update guide for each version lists
the code changes to make by hand.

## The habit that avoids the painful update

The cheapest update is the one that runs every six months on a project that is already close to current.
What that looks like in practice:

- Run `ng update` for the majors as they arrive, and treat the migrations as work in a sprint rather
  than as a project.
- Keep the deprecation warnings visible. A deprecated API that is still compiling is the cheapest thing
  to fix, and the same API removed is a build failure with a deadline attached.
- Have a test suite that runs in a pipeline. A migration that changes behaviour is caught by tests, and
  nothing else catches it.
- Prefer the current spelling in new code, so the old one stops spreading: signals rather than mutable
  fields, `@if` rather than `*ngIf`, `@Service()` or `providedIn: 'root'` rather than a provider list in
  a module that no longer exists.
- Read the release notes for the version you are moving to. The update guide lists the changes by
  category, and five minutes there is cheaper than a day on a build failure.

## The parts of this course most likely to change

Worth a second look when a new major arrives, because they are young:

| Area | Why |
| --- | --- |
| signal forms | stable in v22, and the least settled of the APIs here |
| `httpResource` and resources | stable, and still gaining options |
| zoneless change detection | the default since v21, with debugging tools still arriving |
| server rendering | prerender and hydration both moved in the last few releases |
| the AI-facing tooling | the CLI's MCP server and the agent setup guides are new |

The parts that have not moved in years are the ones at the centre: components with templates,
`HttpClient` with interceptors, the router's guards and resolvers, and dependency injection. A course
that teaches those is not invalidated by a release, and the signals work above them is the layer that
changes.

## Check yourself

Read the update guide for the next major version and note the three changes most likely to affect a
project of yours. Then take a small project, run `ng update` with `-C`, and read the commits the tool
made before you accept them.
