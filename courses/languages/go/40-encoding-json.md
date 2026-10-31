---
title: encoding/json
summary: Struct tags, the fields the decoder ignores, and the number that arrives as a float.
chapter: The standard library
minutes: 14
status: draft
---

## Marshal and Unmarshal

```go
type Row struct {
	Key    string `json:"key"`
	Value  int    `json:"value,omitempty"`
	Secret string `json:"-"`
	Extra  string `json:",omitempty"`
}

row := Row{Key: "a", Secret: "hidden", Extra: "e"}

out, err := json.Marshal(row)
fmt.Println(string(out), err)
```

```text
{"key":"a","Extra":"e"} <nil>
```

Four tag behaviours in one line of output. `value` is absent because `omitempty` drops a zero value. `Secret` is nowhere
because `json:"-"` skips the field. `Extra` kept its own name because `json:",omitempty"` sets the option and leaves the name
alone. The field order follows the struct declaration, which is what the encoder happens to do rather than something to rely
on.

A tag is read by reflection at run time, so a misspelling has no effect and `go vet` is the only thing that will tell you.

## The decoder ignores fields it does not know

```go
var decoded Row

err = json.Unmarshal([]byte(`{"key":"b","value":2,"unknown":true}`), &decoded)
fmt.Println(decoded, err)
```

```text
{b 2  } <nil>
```

No error for `unknown`. That is deliberate and it makes a schema evolution painless, because an old client can receive a new
field without failing. It also means a typo in a tag, or a field name that changed on the other side, produces a zero value
and no complaint.

```go
dec := json.NewDecoder(r)
dec.DisallowUnknownFields()
```

`DisallowUnknownFields` turns an unexpected field into an error, which is the right setting for a configuration file where a
typo should be loud. For a request body it is a decision rather than a default: strict rejects a client that sends an extra
field, and permissive accepts it and ignores it.

## The numbers

```go
var numbers map[string]any
_ = json.Unmarshal([]byte(`{"n":1,"f":1.5}`), &numbers)

fmt.Println(numbers["n"], numbers["f"])
```

```text
1 1.5
```

A number decodes into an `any` as a `float64`, so `n` is a `float64(1)` that prints as `1`. That is why a large integer
loses precision through an `any`: an identifier near the top of the range comes back rounded. The fixes are a struct field
typed `int64`, a `json.Number` with `UseNumber`, or a decoder target that is not `any`.

```go
dec := json.NewDecoder(r)
dec.UseNumber()
```

`UseNumber` decodes into `json.Number` rather than `float64`. It is a string type that converts on demand, so the digits
survive until something asks for them.

## One object per line

```go
dec := json.NewDecoder(strings.NewReader(`{"key":"c"}{"key":"d"}`))

for dec.More() {
	var r Row
	_ = dec.Decode(&r)
	fmt.Print(r.Key, " ")
}
```

```text
c d
```

A `Decoder` reads a stream rather than a document, so two objects in one input are two `Decode` calls. `for dec.More()` is
how the loop is written when the count is unknown, and `Decode` returning `io.EOF` is the other way. For an HTTP body or a log
file the decoder is the version to use, because it never holds the whole input in memory.

`json.NewEncoder(w).Encode(v)` is the other half: it writes one value and a newline, so a loop of `Encode` calls produces
JSON Lines, which is what a log collector or a streaming import wants.

```text
{"key":"e"}
```

`Encoder.SetIndent("", "  ")` writes the pretty version, and `SetEscapeHTML(false)` stops the encoder escaping `<`, `>` and
`&` into their `\u` forms, which matters for a field holding a URL with a query string.

## The error message

```go
bad := json.Unmarshal([]byte(`{"value":"x"}`), &decoded)
fmt.Println(bad)
```

```text
json: cannot unmarshal string into Go struct field Row.value of type int
```

The message names the JSON field, the Go struct and the Go type, which is what makes it actionable.
`*json.UnmarshalTypeError` has those as fields, so a handler can turn it into a per-field validation message rather than a
400 with a string in it. The other one to know is `json.SyntaxError`, which carries an `Offset` for malformed input.

## A custom marshaller

```go
func (c *Custom) MarshalJSON() ([]byte, error) {
	return []byte(`"` + c.When + `"`), nil
}

co, _ := json.Marshal(c)
cp, _ := json.Marshal(&c)
fmt.Println(string(co), string(cp))
```

```text
{"When":"now"} "now"
```

That pair is the trap worth showing. The method is on the pointer receiver, so `*Custom` implements `json.Marshaler` and
`Custom` does not, and the value was marshalled with the default field-based encoding instead. A type with a custom
marshaller usually has it on the pointer receiver, which means it has to be passed as a pointer or the custom behaviour
silently does not apply.

The interfaces are `json.Marshaler` with `MarshalJSON` and `json.Unmarshaler` with `UnmarshalJSON`. Both are called
recursively, so a `MarshalJSON` that calls `json.Marshal` on the receiver loops for ever. The fix is an alias type, which has
the fields and none of the methods:

```go
type customAlias Custom

func (c *Custom) MarshalJSON() ([]byte, error) {
	return json.Marshal(customAlias(*c))
}
```

## The rules

1. Tag every field of a type that crosses a boundary, even when the name already matches.
2. `omitempty` where the zero value should not be sent, and a pointer or a sentinel where zero is meaningful.
3. `json:"-"` for a secret, and remember the field is still in the struct and printed by `%+v`.
4. A struct field typed `int64` rather than `any` wherever the number matters.
5. `DisallowUnknownFields` for a configuration file.
6. A custom marshaller on the pointer receiver means the value has to be a pointer.

## Check yourself

Marshal a struct with an `omitempty` field, a `-` field and an untagged field, and read the output. Decode a document with an
unknown field and with a wrong type and read both results. Then loop a decoder over two objects in one string, and decode a
number into an `any` and into an `int64`.
