---
title: Dates, times and time zones
summary: Aware and naive datetimes, why UTC is the storage format, and the arithmetic that surprises people once a year.
chapter: Data
minutes: 14
status: draft
---

## Four types in one module

```python
from datetime import date, datetime, timedelta, timezone

print(date(2026, 3, 7))
print(datetime(2026, 3, 7, 9, 30))
print(datetime.now(timezone.utc).isoformat())
print(date(2026, 3, 7) + timedelta(days=30))
```

```text
2026-03-07
2026-03-07 09:30:00
2026-03-07T09:30:00.123456+00:00
2026-04-06
```

`date` is a calendar day, `datetime` is a point on a clock, `timedelta` is a duration, and
`timezone.utc` is the offset that makes a `datetime` aware. Storing a duration in a `datetime` is a
common mistake, and it makes every later subtraction wrong.

## Naive and aware do not mix

```pycon
>>> from datetime import datetime, timezone
>>> naive = datetime(2026, 3, 7, 9, 30)
>>> aware = datetime(2026, 3, 7, 9, 30, tzinfo=timezone.utc)
>>> naive == aware
False
>>> aware - naive
Traceback (most recent call last):
TypeError: can't subtract offset-naive and offset-aware datetimes
```

A naive value means nine thirty in a zone nobody wrote down, so comparing it against an aware value
gives an answer that is false but not an error. Store and transmit UTC, and convert to a local zone
only where a person will read it.

## Local zones come from zoneinfo

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

utc = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
local = utc.astimezone(ZoneInfo("America/New_York"))

print(local.isoformat())
print(utc.isoformat())
```

```text
2026-06-01T08:00:00-04:00
2026-06-01T12:00:00+00:00
```

`ZoneInfo` reads the system time zone database, so it knows when the offset changes. A fixed offset
such as `timezone(timedelta(hours=-4))` does not, which is why an event scheduled in summer lands an
hour out in winter.

## Adding a day is not always adding a day

```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

zone = ZoneInfo("America/New_York")
start = datetime(2026, 3, 7, 12, 0, tzinfo=zone)
tomorrow = start + timedelta(days=1)

print(start.isoformat())
print(tomorrow.isoformat())
```

Adding a `timedelta` of one day adds exactly 24 hours. When the zone changes offset in between, the
wall clock the next day is not the same hour, and the output above shows that. When you mean "same
time tomorrow by the clock", decide whether you want 24 hours of elapsed time or the next calendar day
at that hour, then write the one you mean.

## Parsing and formatting

```pycon
>>> from datetime import datetime
>>> datetime.fromisoformat("2026-03-07T09:30:00+00:00")
datetime.datetime(2026, 3, 7, 9, 30, tzinfo=datetime.timezone.utc)
>>> datetime(2026, 3, 7).strftime("%Y-%m-%d")
'2026-03-07'
```

`fromisoformat` reads what `isoformat` writes, and since 3.11 it accepts the common variants including
`Z`. For anything else, `strptime` with an explicit pattern, and wrap it because it raises `ValueError`
on a mismatch.

## Check yourself

Write a function that takes a UTC timestamp and a zone name and returns the local time as ISO text.
Schedule something for 09:00 local on the day after a daylight saving change and compare the elapsed
hours with what you expected.
