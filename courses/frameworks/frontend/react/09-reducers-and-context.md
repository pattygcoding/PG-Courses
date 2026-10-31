---
title: Reducers and context
summary: One state object with typed transitions, shared through a provider, and a hook that refuses to work outside it.
chapter: State and events
minutes: 15
status: draft
---

## A reducer instead of five setters

```tsx
interface SessionState {
  readonly member: string | null;
}

type SessionAction =
  | { readonly type: 'signedIn'; readonly member: string }
  | { readonly type: 'signedOut' };

function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'signedIn':
      return { member: action.member };
    case 'signedOut':
      return { member: null };
    default:
      return state;
  }
}
```

```tsx
const [state, dispatch] = useReducer(reducer, { member: null });

dispatch({ type: 'signedIn', member: 'Ada Lovelace' });
```

`useReducer` is `useState` with the update logic in one place. The action is a value rather than a call, so
the transitions a value can go through are written down and the compiler checks them:

```text
Argument of type '{ type: "signedOut"; }' is not assignable to parameter of type 'SessionAction'.
Property 'member' is missing in type '{ type: "signedIn" }' but required in type '{ type: "signedIn"; member: string; }'.
```

Advantages over three setters, in the order they matter:

- Every way the state can change is in the reducer, so reading one function tells you the shape of the
  feature. That is worth a lot in a component that grows past two pieces of state.
- The reducer is a pure function, so a test can call it with a state and an action and assert the result,
  with no rendering involved.
- The dispatch function has a stable identity, which matters when a child receives it as a prop or through a
  context value.

The `default` branch is unreachable in a project with exhaustive checking, which is why it returns the state
rather than throwing.

## One provider, one tree

```tsx
export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { member: null });

  const signIn = useCallback((member: string) => {
    dispatch({ type: 'signedIn', member });
  }, []);

  const signOut = useCallback(() => {
    dispatch({ type: 'signedOut' });
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ member: state.member, signIn, signOut }),
    [state.member, signIn, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
```

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  </StrictMode>,
);
```

Context is a channel that passes a value down the tree without prop drilling. The provider is a component,
and everything below it can read the value. Put it above the router rather than inside a page, because the
header needs the session and the routing changes what is under it.

Three details in that provider are easy to get wrong:

- `useCallback` on the two handlers keeps their identities stable across renders, so the memo below does not
  rebuild for nothing.
- `useMemo` on the value object does the same for the object itself. An object literal is a new value every
  render, and a new context value re-renders every consumer.
- React 19 lets the provider be `<SessionContext value={...}>` rather than `<SessionContext.Provider>`. Both
  work, and the short form is what the current documentation uses.

With the React Compiler enabled the memo and the callbacks are inserted for you, so writing them by hand is
optional rather than required. They stay in this file because the performance chapter measures both ways.

## The hook that guards the context

```ts
import { createContext, useContext } from 'react';

export interface SessionValue {
  readonly member: string | null;
  readonly signIn: (member: string) => void;
  readonly signOut: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);

  if (value === null) {
    throw new Error('useSession must be used inside a SessionProvider');
  }

  return value;
}
```

Two decisions there. The context default is `null` rather than a fake value, so a component outside the
provider fails loudly instead of reading a plausible object that does nothing. And a `useSession` hook wraps
`useContext`, so every caller imports one function and the error message says what is missing.

That error is one I met while testing this project:

```text
Error: useSession must be used inside a SessionProvider
```

It arrives when a test renders a component that reads the session with no provider around it, which is the
test helper's job, and it is a better failure than a page that renders an empty member name.

## When context is the wrong tool

Context is for a value that many components need and few change: a session, a theme, a locale, a settings
object. It is not a state manager, and two patterns show why:

- Every consumer re-renders when the value changes. A context holding a fast-changing value re-renders the
  whole subtree under it, and the fix is to split the context (the value in one, the dispatch in another) or
  to move the value closer to its readers.
- It does not help a single reader. One component that needs one value has a prop.

The catalogue's books are an example of a value that should not go in context: they come from a route loader,
and the route that needs them reads them from the router, which is cheaper and more local.

## Testing a provider

```tsx
export async function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  await act(async () => {
    render(
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>,
    );
  });

  return router;
}
```

One helper renders the application the way `main.tsx` does, providers included. Every test in this project
uses it, which is why no test has to remember the provider list.

## Check yourself

Move the loan draft into a reducer with `borrowed`, `returned` and `cleared` actions, and write a test for
the reducer with no rendering involved. Then split the session context into a value context and an actions
context and count how many components re-render when the member name changes.
