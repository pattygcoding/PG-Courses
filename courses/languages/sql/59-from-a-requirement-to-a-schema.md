---
title: From a requirement to a schema
summary: A booking system designed in one sitting, with the rule a constraint cannot enforce.
chapter: Where to go next
minutes: 13
status: draft
---

## The requirement

A small booking system, described in a paragraph:

> Venues have a name, a city and a capacity. Events happen at a venue, have a title, a start and end time, their own capacity
> and a price. People book seats on an event. A person can book an event once, and a booking can be cancelled.

Everything in this course is in that paragraph somewhere, and the work is in noticing which words decide the schema.

## Step 1: the nouns become tables

Venue, event, person and booking. The nouns that need a table are the ones with attributes and a life of their own, and these four
each have both. "Capacity" is an attribute of two of them, which is worth noting because it is a trap: a venue's capacity and an
event's capacity are different facts.

## Step 2: the verbs become relationships

- A venue **has** events: one-to-many, so `event.venue_id`.
- An event **has** bookings and a person **has** bookings: two one-to-manys from `booking`.
- A person **books** an event: many-to-many between person and event, and `booking` is the join table. It has attributes of its own,
  which confirms it is a table rather than a link: seats, status and a booking time.

```sql
create table venue(
  id integer primary key,
  name text not null,
  city text not null,
  capacity integer not null check (capacity > 0)
) strict;

create table event(
  id integer primary key,
  venue_id integer not null references venue(id) on delete restrict,
  title text not null,
  starts_at text not null,
  ends_at text not null,
  capacity integer not null check (capacity > 0),
  price_pence integer not null check (price_pence >= 0),
  check (ends_at > starts_at)
) strict;

create table attendee(
  id integer primary key,
  name text not null,
  email text not null unique collate nocase
) strict;

create table booking(
  id integer primary key,
  event_id integer not null references event(id) on delete cascade,
  attendee_id integer not null references attendee(id) on delete restrict,
  seats integer not null default 1 check (seats > 0),
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'attended')),
  booked_at text not null default (datetime('now')),
  unique (event_id, attendee_id)
) strict;
```

## Step 3: the constraints carry the rules

Reading the requirement again for the words that become constraints:

| Phrase | Constraint |
| --- | --- |
| "a capacity" | `check (capacity > 0)` on both tables |
| "a price" | `check (price_pence >= 0)`, and pence rather than a real |
| "a start and end time" | `check (ends_at > starts_at)` |
| "a person can book an event once" | `unique (event_id, attendee_id)` |
| "can be cancelled" | a `status` column with a `check` on the allowed values |
| an event at a venue | `references venue(id)` |
| a booking of an event | `references event(id)` |

The status check is where the requirement's "cancelled" is recorded. A cancelled booking stays in the table with a different status,
because the row is a record that the person booked and changed their mind, and a delete would lose that.

## Step 4: the indexes the queries need

```sql
create index idx_event_venue on event(venue_id);
create index idx_event_starts on event(starts_at);
create index idx_booking_attendee on booking(attendee_id);
```

Every foreign key column gets one, which is the rule from the schema chapter. The `unique (event_id, attendee_id)` on booking
already leads with `event_id`, so an index on `booking(event_id)` alone is redundant and I would not create it. Noticing that is the
whole of the "an index you do not need" skill, and the composite key's column order is what makes it possible.

## Step 5: the queries the requirement implies

```sql
select e.title, sum(b.seats) as seats_sold, e.capacity, e.capacity - sum(b.seats) as seats_left
from event as e join booking as b on b.event_id = e.id
where b.status = 'booked' group by e.id order by e.title;
```

```text
     title        seats_sold  capacity  seats_left
----------------  ----------  --------  ----------
Indexes in anger           3       150         147
Transactions               1       150         149
```

A join, a `GROUP BY`, a `WHERE` on the status and an arithmetic column. Reading the requirement for the reports it implies is how a
schema gets the columns it will be read by, and it is the step that finds a missing index before the report is slow.

## The rule a constraint cannot enforce

```sql
insert into attendee(id, name, email) values (3, 'Alan', 'alan@example.com');
insert into booking(event_id, attendee_id, seats) values (2, 3, 200);
```

```text
     title        seats_sold  capacity  seats_left
----------------  ----------  --------  ----------
Indexes in anger           3       150         147
Transactions             201       150         -51
```

The insert succeeded and the event is overbooked by 51 seats, with the negative `seats_left` as the only evidence. Nothing stopped
it, and the reason is structural: a `CHECK` constraint sees one row, and "the seats sold for this event must not exceed the event's
capacity" is a rule about a **sum over other rows**.

So that rule lives somewhere else, and the options in the order I would try them:

1. **In the application, inside a transaction.** Read the sum, check it, insert. That is a read and a write and it needs the
   isolation to be safe, which means `serializable` or a lock. It works and it is what most projects do.
2. **In a trigger.** A `before insert` trigger that raises when the total would exceed the capacity, which puts the rule in the
   database where every writer meets it, including a script run by hand.
3. **In the schema, by changing the model.** A row per seat rather than a seat count makes the capacity a `unique` constraint on
   `(event_id, seat_number)`, which the database enforces with no trigger. It is a real design and it costs a row per seat.

Option three is the one to consider before reaching for a trigger, because it turns a procedural rule into a declarative one. It is
also more work than most projects will accept, which is why option one is the answer in practice and why the check has to be
written down as a place a bug can hide.

## What the schema got right and wrong

| Decision | Verdict |
| --- | --- |
| pence as an integer | right, and the display divides at the edge |
| ISO text for the times | right for SQLite, and PostgreSQL would take `timestamptz` |
| `status` rather than deleting a cancelled booking | right, because the row is history |
| `on delete cascade` from booking to event | right, because a booking without an event is meaningless |
| `on delete restrict` from booking to attendee | right, because a person's history is worth keeping |
| `unique (event_id, attendee_id)` | right, and it enforces the "once" in the requirement |
| capacity as a `check` only | **wrong**, and the negative `seats_left` is the evidence |
| an index on `booking(event_id)` | **wrong**, and the composite unique already covers it |

Two of eight decisions were wrong on the first pass, and both were found by running the queries the requirement implies rather than
by reading the schema again. That is the process: write the tables, write the queries, and let the queries find the problems.

## Check yourself

Take a paragraph describing a system you know and write the schema for it, then the two or three queries the description implies.
List every rule it describes as a constraint and mark each one as row-level or cross-row. Finish by naming the cross-row rules and
saying where each one will live.
