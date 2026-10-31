---
title: Configuration and environments
summary: One build either bakes a value in or reads it at startup, and the choice decides what you can ship.
chapter: Dependency injection
minutes: 12
status: draft
---

## Two ways a value reaches the application

```ts
// Baked in at build time
export const environment = {
  apiBase: '/api',
  featureFlags: { waitingList: true },
};
```

```ts
// Read at startup, in the running container
interface RuntimeConfig {
  readonly apiBase: string;
}
```

The first is a constant that the bundler inlines, so the value is in the shipped JavaScript. The second
is a request before the application renders, and the same bundle works in every environment. Both are
legitimate, and the difference matters as soon as you have more than one deployment target.

## The generated environment files

```bash
ng generate environments
```

```text
CREATE src/environments/environment.ts
CREATE src/environments/environment.development.ts
UPDATE angular.json
```

Both files start empty:

```ts
export const environment = {};
```

and `angular.json` gains a replacement in the development configuration:

```json
"development": {
  "optimization": false,
  "extractLicenses": false,
  "sourceMap": true,
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.development.ts"
    }
  ]
}
```

Read that as a build instruction rather than a runtime one. Every import of
`environments/environment.ts` is swapped for the development file during a development build, and the
production build is the one that keeps the original. A value placed there cannot change after the
build, so a build has to be produced per environment. That is the cost, and `ng build --configuration`
is how you pay it.

Because the file is assigned to a token, nothing that reads configuration knows where it came from:

```ts
// src/environments/environment.ts
export const environment = {
  apiBase: 'https://library.example.com/api',
};
```

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: API_BASE, useValue: environment.apiBase },
    provideHttpClient(withInterceptors([apiInterceptor])),
  ],
};
```

The token has a `providedIn: 'root'` factory returning `/api` for development. A provider in
`appConfig` overrides it for a build, and the code that reads `API_BASE` is unaware of either.

## The same artifact everywhere

When the same build has to run in staging and production, the value has to arrive after the bundle is
loaded. `provideAppInitializer` is where that request goes, and the promise it returns holds up the
first render:

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(async () => {
      const response = await fetch('/config.json');
      return (await response.json()) as RuntimeConfig;
    }),
  ],
};
```

A resolved value is available through a token, so the request and the token belong in one place:

```ts
// src/app/config.ts
export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('runtime.config');

export function provideRuntimeConfig(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: RUNTIME_CONFIG,
      useFactory: async () => (await fetch('/config.json')).json() as Promise<RuntimeConfig>,
    },
  ]);
}
```

`/config.json` is written by the deployment: a ConfigMap mount, a file in the image, or a small
endpoint. The bundle is built once, and the environment is decided when the container starts.

## What must not go in either

An API key, a database URL with a password and anything else secret belongs on the server. Anything in
the environment files and anything in `/config.json` is readable in the browser, because both arrive
there. A "private" key in an Angular build is a public key with a longer story.

The related trap is a build for the wrong environment: `ng build` defaults to the production
configuration, so a build script that omits the configuration for staging ships production values. I
name the configuration in the build command rather than relying on the default.

## Check yourself

Add an `environment.development.ts` with a different `apiBase`, build with and without
`--configuration development`, and search the output JavaScript for both strings to see which one made
it. Then move the value to a `/config.json` read at startup and confirm the same bundle works with two
different files.
