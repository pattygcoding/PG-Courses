---
title: String formatting
summary: f-strings for almost everything, the format spec for the details, and templates when the text is not yours.
chapter: Language basics
minutes: 11
status: draft
---

## f-strings read like the output

```python
name = "Ada"
rate = 0.075
print(f"{name} pays {rate:.1%}")
print(f"{name!r} has {len(name)} letters")
```

```text
Ada pays 7.5%
'Ada' has 3 letters
```

The `!r` suffix uses `repr`, which is how you see the quotes and the escapes. Keep the expressions
inside braces small, because a call with a side effect is a bug that hides well.

## The format spec after the colon

```python
value = 1234567.891
print(f"{value:,.2f}")
print(f"{value:>14,.2f}")
print(f"{255:#06x}")
```

```text
1,234,567.89
  1,234,567.89
0x00ff
```

The grammar is `[[fill]align][sign][#][0][width][,][.precision][type]`. Two pieces earn their place
in memory: `,` for a thousands separator and `.2f` for money.

## Dates and zero padding

```python
from datetime import date

print(f"{date(2026, 3, 7):%Y-%m-%d}")
print(f"{7:02d}:{5:02d}")
```

```text
2026-03-07
07:05
```

## When the template is not yours

If the text comes from a config file, a translation or a user, use `string.Template` or
`str.format_map` with a mapping. An f-string is code, so building one from untrusted text is the
same mistake as calling `eval`.

```python
from string import Template

invoice = Template("Invoice for $customer: $total")
print(invoice.substitute(customer="Ada", total="12.00"))
```

`substitute` raises when a placeholder is missing, and `safe_substitute` leaves it in place instead.
Pick based on whether a missing field should stop the run.

## Check yourself

Format `1234.5` as a currency amount with a thousands separator, two decimals and right alignment
in 12 columns. Then produce the same string with `string.Template`.
