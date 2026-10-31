---
title: Templates and text handling
summary: Formatting and parsing without a library, and the template engine that escapes by default.
chapter: The standard library
minutes: 13
status: draft
---

## Formatting without a template

```go
fmt.Sprintf("%s: %d", key, n)
fmt.Fprintf(w, "%-10s|%6.2f\n", name, value)
```

The verb set from the first chapter covers most needs, and the width and precision parts are worth knowing for aligned
output: `%10s` pads to the right, `%-10s` pads to the left, `%6.2f` is a float in six columns with two decimals, and `%q`
quotes a string. `%v` of a slice prints its elements separated by spaces, and `%+v` of a struct adds the field names.

For anything with structure, `text/tabwriter` aligns the columns without counting characters:

```go
w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)

for _, row := range rows {
	fmt.Fprintf(w, "%s\t%d\t%s\n", row.Key, row.Value, row.Note)
}

w.Flush()
```

The tab characters become the column separators and the writer pads them to the widest cell, which is how `go doc` and
`go help` produce aligned output. The `Flush` is the same rule as the buffered writer from the files lesson.

## Parsing text

```go
n, err := strconv.Atoi(s)
f, err := strconv.ParseFloat(s, 64)
b, err := strconv.ParseBool(s)
v, err := strconv.ParseInt(s, 16, 64)
```

`ParseInt` takes a base and a bit size, so a hex string is `ParseInt(s, 16, 64)` and a binary one is base 2. A base of 0
accepts all the Go literal prefixes (`0x`, `0o`, `0b`) which is what a configuration file with numbers in several bases
wants.

```go
fmt.Sscanf("row-42", "row-%d", &n)
```

`Sscanf` parses by format, which is useful for a fixed shape and awkward for anything else. For a delimited line,
`strings.Cut` or `strings.Split` is clearer, and for a regular expression there is `regexp`:

```go
var rowRE = regexp.MustCompile(`^row-(\d+)$`)

m := rowRE.FindStringSubmatch(input)

if m != nil {
	n, _ = strconv.Atoi(m[1])
}
```

The pattern is compiled once, at package level, because `Compile` is expensive and `MustCompile` panics at start-up if the
pattern is wrong. That is a legitimate use of a `must` helper: a bad pattern is a bug and failing immediately beats failing on
the first request.

## text/template

```go
tmpl := template.Must(template.New("row").Parse("{{.Key}}: {{.Value}}\n"))

if err := tmpl.Execute(w, row); err != nil {
	return err
}
```

```text
{{if .Items}}has {{len .Items}} items{{else}}empty{{end}}
```

A template is parsed once and executed many times, so the `template.Must(template.ParseFS(...))` at start-up is the pattern.
`Execute` writes to any `io.Writer`, which is the same interface from the io lesson, so a template can write to a file, a
buffer or a response body with no change.

The actions worth knowing:

| Action | Meaning |
| --- | --- |
| `{{.Field}}` | a field of the data |
| `{{.Method}}` | a method call with no arguments |
| `{{if}}`, `{{else}}`, `{{end}}` | a conditional |
| `{{range .Items}}...{{end}}` | iteration, with `{{.}}` as the element |
| `{{with .User}}...{{end}}` | a scoped value, skipped when empty |
| `{{printf "%d" .N}}` | a function call from the template's function map |

`{{range}}` sets `{{.}}` to each element, and `{{$.Name}}` reaches back to the root data from inside a range. That dollar
prefix is the one bit of syntax that catches people, and it is the answer to "how do I get the outer value".

## html/template escapes by default

```go
tmpl := template.Must(template.New("page").Parse(`<p>{{.Note}}</p>`))

_ = tmpl.Execute(w, struct{ Note string }{Note: `<script>alert(1)</script>`})
```

```text
<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>
```

`html/template` is the same engine with contextual escaping: it knows whether a value is being written into HTML text, an
attribute, a URL or a JavaScript block, and it escapes for that context. The same value printed by `fmt` is not escaped at
all:

```go
fmt.Fprintf(w, "<p>%s</p>", note)
```

```text
<p><script>alert(1)</script></p>
```

That pair is the reason to use `html/template` for anything that produces HTML, and the escaping is per context rather than
per tag. A URL with a dangerous scheme is refused instead of escaped:

```go
template.Must(template.New("x").Parse(`<a href="{{.Note}}">x</a>`))
```

```text
<a href="#ZgotmplZ">x</a>
```

`#ZgotmplZ` is the marker `html/template` writes when it refuses a value in that context, and it is worth recognising
because it means a URL from somewhere is being treated as hostile. The escaping is per context, which is why a value that
is safe in a text node is not automatically safe in an `href` or a script block.

`template.HTML` bypasses the escaping and is how a trusted fragment of markup is passed through. Every use of it is a
decision that the value is trusted, so a `template.HTML` built from user input is the bug to look for.

One practical detail: a program that uses both engines cannot import both as `template`:

```text
template redeclared in this block
```

Aliasing one of them is the fix, and `htmltemplate` for the HTML one is the convention I use.

## Embedding a template

```go
//go:embed templates/*.html
var templatesFS embed.FS

var pages = template.Must(template.ParseFS(templatesFS, "templates/*.html"))
```

`ParseFS` reads every matching file through an `fs.FS`, so the templates are in the binary and the same code reads them from
a directory in a test. `{{template "name"}}` includes another one and `{{define "name"}}` names a block, which is how a page
layout and its parts are assembled.

## The rules

1. `fmt` with a width for aligned output, `tabwriter` when the widths are unknown.
2. `strconv` for a single value, `strings` for a delimited line, `regexp` for a shape.
3. Compile a regular expression once at package level.
4. `html/template` for HTML, and never string concatenation.
5. A `template.HTML` value is a trust decision.
6. `//go:embed` the templates so the binary is self-contained.

## Check yourself

Format three rows with `%s`, `\t` and a `tabwriter` and compare the alignment. Parse a number in hex and in decimal with
`ParseInt`, then write a template with a range and a conditional and execute it with a struct. Finish by rendering a note
containing a script tag through `html/template` and through `fmt.Fprintf` and compare the two outputs.
