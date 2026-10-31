---
title: Immutable update patterns
summary: Rebuilding only the path that changed, why a framework cares, and when mutating is the honest choice.
chapter: Arrays and data
minutes: 13
status: draft
---

## Reference equality is how a change is detected

```js
const before = { count: 0 };
const after = before;

after.count = 1;

console.log(after === before);      // true, same object
```

Both names point at one object, so nothing can tell that the state changed by comparing references. Replacing the
object instead of changing it gives a comparison that works:

```js
let state = { count: 0 };

function increment(current) {
  return { ...current, count: current.count + 1 };
}

const next = increment(state);

console.log(next === state);        // false
console.log(state.count);            // 0, untouched
```

That is why React, Vue, Redux and every other change-detecting system wants a new object: comparing two references is
a pointer comparison, and comparing two structures is a walk over everything. A shallow copy per update turns the
cheap comparison into a correct one.

## Only the path that changed is copied

```js
const state = {
  user: { name: 'ada', address: { city: 'London' } },
  items: [],
};

const moved = {
  ...state,
  user: {
    ...state.user,
    address: { ...state.user.address, city: 'York' },
  },
};
```

`items` is the same array, `user.name` is the same string, and the objects along the path to `city` are new. That is
structural sharing: the parts that did not change are shared by reference, so an update costs the depth of the change
rather than the size of the state.

The cost is the boilerplate. Three levels deep means three spreads, and a fourth level is where people reach for a
helper:

```js
import { produce } from 'immer';

const moved = produce(state, (draft) => {
  draft.user.address.city = 'York';
});
```

`produce` gives you a mutable looking draft, records what changed, and returns a new object with the untouched parts
shared. The library is a dependency and it removes the part of the code that was hardest to read, which is a trade
worth making once the nesting gets past two levels.

## Updating an array

```js
const items = [{ id: 1, done: false }, { id: 2, done: false }];

const added = [...items, { id: 3, done: false }];                 // add
const removed = items.filter((item) => item.id !== 2);             // remove
const toggled = items.map((item) =>
  item.id === 1 ? { ...item, done: true } : item);                  // update one
```

The three cases cover almost everything, and each one returns a new array with the unchanged objects shared. Updating
by index has a shorter form now:

```js
const atIndex = items.with(1, { id: 2, done: true });
```

`with` replaces one position without touching the rest, which is what a list of rows keyed by index needs. For a list
keyed by identifier, the `map` with a conditional is still the right shape because the index is not what you have.

A `filter` that removes an element and a `map` that updates one are both one pass and both easy to read. The version
that goes wrong is splicing a copy in place:

```js
const copy = [...items];
copy.splice(index, 1);
```

That is correct and harder to follow than `filter`, because the reader has to confirm that `copy` is not shared.

## Beware of the sort that mutates its input

```js
function sortedItems(state) {
  return state.items.sort(byId);        // sorts the state
}

function sortedItems(state) {
  return state.items.toSorted(byId);     // returns a new array
}
```

A helper that appears to read state and quietly sorts it in place is the classic immutable update bug, and it shows up
as a list that reorders itself with no visible cause. `toSorted`, `toReversed`, `toSpliced` and `with` exist for this
reason.

## Mutating a draft and publishing the result is fine

```js
function buildReport(records) {
  const rows = [];

  for (const record of records) {
    rows.push({ key: record.key, size: record.size });
  }

  return rows;
}
```

The array is local, nothing else holds it, and pushing into it is the fastest and clearest way to build it. Immutable
updates matter at the boundary where state is shared, not inside a function that constructs a value and returns it.
The habit to avoid is the middle ground: a function that takes an object and mutates it while the caller believes it
did not.

## Freezing protects the boundary

```js
const state = Object.freeze({ count: 0, items: Object.freeze([]) });

try {
  state.count = 1;
} catch (error) {
  console.log(error.name);       // 'TypeError' in a module
}
```

A deep freeze in a test or in a development build catches the accidental mutation at the line that does it. It is
shallow, so every nested object needs its own call, and freezing every object on every update in production is a real
cost for a check that belongs in development.

## Comparing deep values in a test

```js
import { isDeepStrictEqual } from 'node:util';

isDeepStrictEqual(next, { count: 1 });       // true
```

A test that asserts on a value compares structures, because `===` on two different objects is false however identical
they look. The test runner has its own deep equality in `node:assert`, and `isDeepStrictEqual` is the one to reach for
outside a test.

## Check yourself

Update a nested object three levels deep with spreads and confirm the untouched siblings are the same references.
Then add, remove and update an item in an array three ways, and assert that the original array is unchanged.
