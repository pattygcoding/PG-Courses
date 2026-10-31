---
title: What Angular is
summary: A compiler, a container and a router arrive together, and the bundle carries them whether you use them or not.
chapter: Getting started
minutes: 13
status: draft
---

## Five decisions the framework makes for you

The CLI installs more than a view layer:

| Package | What it owns |
| --- | --- |
| `@angular/compiler` | turning templates into instructions at build time |
| `@angular/core` | components, directives, signals, dependency injection |
| `@angular/router` | URLs, route parameters, lazy routes |
| `@angular/forms` | three form APIs over the same state model |
| `@angular/common/http` | requests, interceptors, reactive resources |

A rendering library leaves those choices to you. The trade is honest in both directions: here you get
one answer to each question that works with the others, and you pay for all five in the initial
bundle whether or not you use them.

## An application is one function call

```ts
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
```

`bootstrapApplication` takes the root component and a list of providers, and returns a promise that
rejects when the first render fails. There is no module to declare and no platform to set up.

The providers are where the framework is configured. A project generated today arrives like this:

```ts
// src/app/app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { apiInterceptor } from './library/api.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiInterceptor])),
  ],
};
```

Read that as a list of capabilities: report uncaught errors to a service, route with parameters bound
into component inputs, and make HTTP requests pass through one interceptor. A capability that is not
in the list does not exist in the application.

## Zone.js is not in the list

Older Angular versions bootstrapped a `zone.js` shim that patched `setTimeout`, `addEventListener` and
promises so the framework could guess when something changed. Angular 21 made the zoneless runtime
the default for new projects, so the guess is gone and the framework is told instead:

- writing a signal through `set` or `update` schedules an update,
- an event handler bound in a template schedules an update,
- the router and `HttpClient` schedule updates because they are built to.

If you find `provideZoneChangeDetection` in a project, that is a project holding on to the old
behaviour. `provideZonelessChangeDetection()` is the v20 spelling of what is now the default.

## The compiler is the strict part

Templates are not strings at runtime. The compiler reads every one at build time, checks the types of
bindings, and produces JavaScript that creates the DOM directly. That check is worth relying on. Two
errors I hit while writing this course:

```text
X [ERROR] NG8001: 'app-shelf-summary' is not a known element
X [ERROR] NG8022: Setting the 'name' attribute is not allowed on nodes
           using the '[formField]' directive
```

Neither is a runtime surprise. A component that is not in the `imports` array is a compile failure,
and a password box bound to a form field tells you at build time rather than after a deploy.

## A build, measured

```bash
ng build
```

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-XXXXXXXX.js    | main          | 294.73 kB |                82.08 kB
styles-XXXXXXXX.css | styles        |    0 bytes |                 0 bytes

Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-XXXXXXXX.js   | loan-form     |  64.27 kB |                16.20 kB
chunk-XXXXXXXX.js   | book-list     |   2.54 kB |                1.16 kB
chunk-XXXXXXXX.js   | book-detail   |   1.22 kB |                 684 bytes
chunk-XXXXXXXX.js   | shelf-summary |    541 bytes |               541 bytes
```

The initial 295 kB is the price of the five decisions above, and the four lazy chunks are routes and
one deferred block that the first page never loads. Numbers like these are the reason a route is worth
lazy loading and a tiny summary component is not worth splitting by hand.

## Check yourself

Run `ng version` in a project and read the version list. Then remove `provideRouter` from the
providers array, add `[routerLink]="'/books'"` to a template, and read the error the compiler gives
you. Put the provider back before you move on.
