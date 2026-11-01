---
title: The context window
summary: The whole of the model's memory for one call, and what happens at the edge.
chapter: Generation
minutes: 12
status: draft
---

## What the window holds

Everything the model can see for one call is the tokens you sent. There is no other memory: not the last
conversation, not the file you read yesterday, not the schema in your database. A fresh call starts blank.

The window is the maximum number of tokens held at once, and it covers input and output together. Ask for
a long answer and you have less room for the question.

## The model is a function of its context

A small demonstration, using the model built for this course. It looks two words back, so changing the
earlier words changes the prediction:

```text
next tokens after "the librarian":
  renewed    count-derived logit 1.386
  .          count-derived logit 1.386
  checked    count-derived logit 0.693
```

The context is the only input. A large model runs the same arithmetic with a window of thousands of tokens
and a far better sense of what belongs next, and one property is unchanged: what is not in the window
cannot affect the answer.

## What happens at the edge

Three behaviours appear as a conversation approaches the limit, and which one you get depends on the
product.

- Truncation. The oldest turns are dropped, so the instructions you gave first disappear.
- Summarisation. Earlier turns are replaced by a summary, which is lossy and invisible.
- Refusal. The request fails, and a failure is at least honest.

The second causes the strangest bugs, because the model keeps answering while the constraint you set at
the start has quietly gone.

## Working inside the window

Four habits follow, and the first two matter most.

- Put the durable instructions first, so truncation hits the least important part.
- Start a conversation per task rather than carrying one all day.
- Attach the files that matter rather than hoping the tool finds them.
- Watch the count on a long session, since a full window is also a large bill.

## Check yourself

Take a long conversation you have had and pick the single instruction you would least want dropped. Write
down where in the conversation it appears, and what you would change to protect it.
