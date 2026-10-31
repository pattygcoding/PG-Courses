---
title: Effects and external systems
summary: An effect synchronises React with something outside it, and the cleanup is half of the effect.
chapter: Effects and data
minutes: 14
status: draft
---

## What an effect is for

An effect runs after React has committed the render, and it exists to connect the component to something
that is not React: a timer, an event listener, a subscription, the browser title, the document's storage. The
rule from the documentation is worth repeating in its own words: an effect synchronises with an external
system.

Two shapes, and the second one matters:

```tsx
useEffect(() => {
  document.title = `${book.title} - Northside Library`;
}, [book.title]);
```

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    setParams(next);
  }, 300);

  return () => clearTimeout(timer);
}, [term]);
```

The function an effect returns is its cleanup. React calls it before running the effect again and when the
component leaves the page, which means a subscription, a timer or a request started in the effect has a place
to be undone next to the code that started it. That pairing is the reason to keep an effect body small: the
setup and the cleanup are easier to check when they are three lines apart.

The catalogue writes the search term into the URL and returns that cleanup:

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (term.length === 0) {
        next.delete('q');
      } else {
        next.set('q', term);
      }
      return next;
    }, { replace: true });
  }, 300);

  return () => clearTimeout(timer);
}, [term, setParams]);
```

Every keystroke clears the previous timer, so one write happens 300 ms after the typing stops. Without the
cleanup, one write would happen per keystroke and the history would fill with them.

## The dependency array

```tsx
useEffect(() => { /* runs after every render */ });
useEffect(() => { /* runs once, after the first render */ }, []);
useEffect(() => { /* runs when id changes */ }, [id]);
```

The array lists the reactive values the effect reads. Three consequences follow:

- React compares each entry with the value from the last render, using `Object.is`. A new array or object
  literal built during the render is a new value every time, so an effect that depends on one runs on every
  render. Hoisting the value out or listing its contents instead is the fix.
- A missing dependency makes the effect read a stale value. The linter reports it, and so does the compiler
  when it skips a component it cannot verify.
- An effect with `[]` is not "run on mount" in spirit, even though that is what happens in practice. It means
  the effect reads nothing reactive, and that should be true.

## StrictMode runs it twice

```text
setup -> cleanup -> setup
```

In development, `StrictMode` mounts each component, runs its effects, tears them down and mounts it again.
That is a rehearsal for a real application where a page is added and removed, and it is the cheapest way to
find an effect that forgets its cleanup: a listener added twice fires twice, and a request started twice
arrives out of order.

Two requests in the network panel during development are usually this. They are not a bug in the component
and do not appear in a production build. What they do mean is that the cleanup has to be correct, because a
double mount really does happen when a route remounts a component or a list reorders.

## What does not belong in an effect

Four patterns that read as effects and should not be:

```tsx
// derived state
useEffect(() => setFullName(`${first} ${last}`), [first, last]); // a const during the render

// a reaction to a click
useEffect(() => { if (submitted) post(data); }, [submitted]);   // the click handler

// a request for data a route needs
useEffect(() => fetchBooks().then(setBooks), []);               // a loader, next chapter

// an external store read once
useEffect(() => setTheme(localStorage.getItem('theme')), []);   // the state initializer
```

The linter has a rule for each of them, and the wording of one is the clearest summary of the whole page:

```text
Effects should synchronize React with external systems. Calling setState synchronously inside an
effect starts another render and is usually unnecessary. Derive the value during render, initialize
state directly, or update it from the event that caused the change.
```

I hit that message in this project, in a hook that set `loading: true` inside its effect. The restructured
version puts the flag in the handler that caused the reload, and the effect only starts the request.

## Subscribing to something

```tsx
useEffect(() => {
  function onResize(): void {
    setWide(window.innerWidth > 720);
  }

  window.addEventListener('resize', onResize);

  return () => window.removeEventListener('resize', onResize);
}, []);
```

```tsx
function onResize(): void {
  setWide(window.innerWidth > 720);
}

useEffect(() => {
  onResize();
  window.addEventListener('resize', onResize);

  return () => window.removeEventListener('resize', onResize);
}, []);
```

The second version reads the current width immediately and then subscribes, because an effect runs after the
first render and the value it computes would otherwise be missing until the first event. It also relies on
`onResize` being declared outside the effect, which is a hint that the function does not depend on the
render.

One subscription does not need a library, and three do. `useSyncExternalStore` is the hook for a real
external store, and the data chapter of the framework documentation covers it.

## Check yourself

Add an effect that logs the window width and removes its listener on cleanup, then remove the cleanup and
watch the log after navigating between two pages three times. Finally, move the width into state read in the
effect, and decide whether the value belongs in a context or in each component that needs it.
