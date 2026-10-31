---
title: Server rendering and hydration
summary: A build that inlines the first page, the transfer state that stops the refetch, and what breaks when there is no browser.
chapter: Shipping
minutes: 16
status: draft
---

## Adding it

```bash
ng add @angular/ssr
```

```text
CREATE src/main.server.ts
CREATE src/app/app.config.server.ts
CREATE src/app/app.routes.server.ts
CREATE src/server.ts
UPDATE angular.json
UPDATE tsconfig.app.json
UPDATE package.json
UPDATE src/app/app.config.ts
```

Each file has one job. The server config merges the shared config with server rendering:

```ts
// src/app/app.config.server.ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

Hydration is switched on in the shared config, which is what makes the client reuse the server's DOM
instead of throwing it away and rendering again:

```ts
providers: [
  provideBrowserGlobalErrorListeners(),
  provideRouter(routes, withComponentInputBinding()),
  provideHttpClient(withInterceptors([apiInterceptor])),
  provideClientHydration(),
]
```

The server file is the generated Express host, with the comments removed:

```ts
// src/server.ts
import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.static(browserDistFolder, { maxAge: '1y', index: false, redirect: false }));

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
```

Two things stand out in that file. Static files are served before the renderer, with a one year cache
because their names are hashed. And the renderer only runs for requests the static handler did not
answer, which is why a prerendered page never touches the Angular server.

## Three render modes per route

| Mode | When the HTML is produced | Best for |
| --- | --- | --- |
| `Prerender` | at build time, as static files | marketing pages and anything not personalised |
| `Server` | per request, on the server | pages that depend on the URL or the session |
| `Client` | never on the server, in the browser | dashboards behind a login |

The generated default is `Prerender` for everything, and a parameterised route under that default stops
the build with a message that says exactly what to do:

```text
X [ERROR] The 'books/:id' route uses prerendering and includes parameters, but
'getPrerenderParams' is missing. Please define 'getPrerenderParams' function for
this route in your server routing configuration or specify a different 'renderMode'.
```

Either list the ids to prerender or move the route to another mode. Here the detail page is server
rendered per request, and the two forms are client only, because a form has no state to render before
the browser has it:

```ts
export const serverRoutes: ServerRoute[] = [
  { path: 'books/:id', renderMode: RenderMode.Server },
  { path: 'loans/new', renderMode: RenderMode.Client },
  { path: 'reservations/new', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
```

## What the build produces

```text
Initial chunk files | Names            |  Raw size | Estimated transfer size
main-XXXXXXXX.js    | main             | 294.73 kB |                82.08 kB
                    | Initial total    | 327.29 kB |                91.75 kB

Server bundles
server.mjs           | server           | 918.71 kB
polyfills.server.mjs | polyfills.server | 237.53 kB
main.server.mjs      | main.server      |  50.71 kB

Prerendered 1 static route.
Output location: dist/northside-library
```

The browser bundle grows by about 30 kB because hydration needs the code that adopts existing DOM, and
the prerendered pages land in `dist/<project>/browser` beside the JavaScript. The server bundle is the
whole framework plus the application, which is why that host needs memory rather than nothing.

## Running it

```bash
npm run serve:ssr:northside-library
```

```text
Node Express server listening on http://localhost:4000
```

The script name comes from the package name, and `PORT` overrides 4000.

One thing refuses to work the first time. The generated build config carries an empty allow list:

```json
"security": {
  "allowedHosts": []
}
```

With it empty, every request is answered before the application runs:

```text
Header "host" with value "localhost:4000" is not allowed.
```

That check is there so a forged `Host` header cannot turn the server into a proxy for a request the
attacker chose. The list is configured in two places: `security.allowedHosts` in `angular.json` for the
dev server and the build, and the `NG_ALLOWED_HOSTS` environment variable for the built node server,
which the bundle reads at startup. I had to set the variable while checking the render myself.

## What the response looks like

```html
<app-root ng-version="22.2.4" ng-server-context="ssg">
  <header class="shell">
    <a routerlink="/books" class="brand" href="/books">Northside Library</a>
  </header>
  <main class="shell">
    <router-outlet></router-outlet>
    <app-book-list>
      <h1>Catalogue</h1>
      <p>4 of 4 books</p>
      <ul>
        <li><a href="/books/dune">Dune</a> by Frank Herbert ...</li>
      </ul>
    </app-book-list>
  </main>
</app-root>
```

Three details in that markup are the whole feature:

- The catalogue is in the HTML, so the first paint happens before any JavaScript is parsed.
- `ng-server-context="ssg"` marks the render as having happened at build time, and hydration comments
  mark the nodes the client will adopt rather than recreate.
- A `<script id="ng-state" type="application/json">` block carries the HTTP responses the server already
  fetched:

```text
{"b":[{...books...}],"h":{},"s":200,"st":"OK","u":"/api/books.json","rt":"json"}
```

That is the transfer state. The server fetched the catalogue to render the page, and the browser reads
those responses out of the document instead of asking again, so hydration does not produce a second
round of requests for the same data.

## What breaks without a browser

- `window`, `document` and `localStorage` do not exist on the server. `afterNextRender` is the escape
  hatch for anything that needs the DOM, which is why the autofocus in the search box lives there.
- A `@defer` block does not render on the server, so it is also the tool for a client-only widget.
- A service provided in root that holds request specific state is shared between requests on the same
  process. The fix is a request scoped provider or passing the value through the route.
- An auth token lives in a cookie the server can read rather than in `localStorage`, once any page is
  rendered per request. A `Client` route keeps that out of scope.

## Check yourself

Add a prerendered page, build, and find its HTML in `dist/<project>/browser`. Then read the transfer
state JSON out of the document and find the request it came from, and finally remove
`provideClientHydration()` and compare the network panel on a hard reload.
