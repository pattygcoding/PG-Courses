---
title: Stimulus
summary: A controller per behaviour, the data attributes that wire it up, and the case for writing less JavaScript.
chapter: Hotwire
minutes: 13
status: draft
---

## What the generator wrote

```js
// app/javascript/controllers/hello_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.textContent = "Hello World!"
  }
}
```

Stimulus finds that class, registers it under the name `hello`, and runs `connect` when an element with the matching
attribute appears in the page:

```erb
<div data-controller="hello"></div>
```

The registration is automated by two lines the generator also wrote:

```js
// app/javascript/controllers/index.js
import { application } from "controllers/application"
import { eagerLoadControllersFrom } from "@hotwired/stimulus-loading"
eagerLoadControllersFrom("controllers", application)
```

`eagerLoadControllersFrom` reads the directory and registers every `*_controller.js` by file name, so adding a file is
the whole installation step. `config/importmap.rb` has the matching line:

```ruby
pin_all_from "app/javascript/controllers", under: "controllers"
```

## The three attributes

```erb
<div data-controller="counter" data-counter-step-value="5">
  <button data-action="counter#bump">+</button>
  <span data-counter-target="count">0</span>
</div>
```

```js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["count"]
  static values = { step: Number }

  bump() {
    this.countTarget.textContent = Number(this.countTarget.textContent) + this.stepValue
  }
}
```

| Attribute | Means |
| --- | --- |
| `data-controller="counter"` | this element is managed by that controller |
| `data-action="counter#bump"` | clicking it calls the controller's `bump` |
| `data-counter-target="count"` | this element is `this.countTarget` |
| `data-counter-step-value="5"` | this is `this.stepValue`, as a Number |

Three things come out of that design, and each is a reason the framework is shaped this way:

- The behaviour is attached to the HTML rather than to a selector, so it survives Turbo replacing the body. A
  `document.querySelector` in a script tag is the thing this is designed to replace.
- The state lives in the HTML, so a page rendered by the server and a page replaced by a Turbo Stream behave the same.
- Nothing is global. Two counters on one page are independent, because each element has its own controller instance.

## Lifecycle

```js
export default class extends Controller {
  connect() {
    // the element is in the page
  }

  disconnect() {
    // the element was removed: clear timers, close connections
  }

  stepValueChanged(value, previousValue) {
    // a value attribute changed
  }
}
```

`connect` and `disconnect` run whenever the element appears or disappears, including through Turbo, which is what makes
a link-free event listener safe: `disconnect` is where the interval, the websocket or the observer is cleaned up.

`stepValueChanged` is called when the attribute changes, and it is named by convention: the value's name plus
`Changed`.

## When it is worth writing

The application in this course has no Stimulus controller, and that is a deliberate outcome: the catalogue filters
inside a Turbo Frame, the waiting list updates through a Turbo Stream, and sign-out is a `button_to`. Three behaviours
that in older Rails would have needed JavaScript are handled by the server and the framework.

Write a controller when the browser has to do something the server cannot:

| Need | Stimulus |
| --- | --- |
| a dropdown that opens without a request | yes |
| character counting as a person types | yes |
| copying a value to the clipboard | yes |
| a dialog | yes, or `<dialog>` and a controller to open it |
| filtering a list | a Turbo Frame, unless the data is already on the page |
| a toast that fades | CSS animation, or a controller for the timer |
| a chart | a controller that hands data to a charting library |
| form validation before submit | the browser's own validation is usually enough |

The last row is the one to try first: `required`, `type="email"` and `minlength` are free, they work without JavaScript
and they are honest about failure. Stimulus is for the things those cannot do.

## Where the file goes and how it loads

```text
app/javascript/controllers/counter_controller.js   ->  data-controller="counter"
app/javascript/controllers/hello_controller.js     ->  data-controller="hello"
```

The file name minus `_controller` is the attribute value. No import map entry, no registration list, and no build step:
the browser fetches the module when the page asks for it, which is what the importmap chapter is about.

A third-party library can be pinned and used from a controller without a bundler:

```bash
bin/importmap pin chart.js
```

```js
import { Chart } from "chart.js"
```

The importmap chapter covers what that command does.

## Check yourself

Write a Stimulus controller for the days field on the loan form that shows the due date as a person types a length,
using a `values` declaration for the start date. Then decide whether a Turbo Stream would be a better answer and why.
