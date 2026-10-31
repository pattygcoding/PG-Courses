---
title: Test doubles and mocking
summary: Fakes, stubs and mocks, when a hand written double is better, and the assertions that survive a refactor.
chapter: Testing and quality
minutes: 14
status: draft
---

## The vocabulary

| Double | What it is |
| --- | --- |
| Dummy | an argument passed to satisfy a signature and never used |
| Stub | returns a canned answer |
| Fake | a real implementation with a simpler store, such as a map instead of a database |
| Mock | records the calls it received so they can be asserted |
| Spy | wraps a real object and records the calls |

The names are worth keeping straight because the choice between them decides whether a test survives a
refactor. A stub or a fake is asserted on the result of the code under test. A mock puts the interaction
itself in the assertion.

## A hand written fake is often the best double

```java
final class InMemoryRows implements RowStore {
    private final Map<String, Row> rows = new HashMap<>();

    @Override
    public void save(Row row) {
        rows.put(row.key(), row);
    }

    @Override
    public Optional<Row> find(String key) {
        return Optional.ofNullable(rows.get(key));
    }
}
```

Twenty lines, no library, real behaviour, and the test asserts on what the store contains rather than on
which methods were called. It also gets reused across every test that needs a store, and a change to the
interface is one compile error to fix rather than a dozen `when` calls.

Reach for a fake when the interface is small and you own it. Reach for a mock when the interface is large, is
not yours, or the interaction is the thing being tested.

## Mockito

```java
@Test
void asksTheStoreForTheRow() {
    RowStore store = mock(RowStore.class);
    when(store.find("a")).thenReturn(Optional.of(row("a")));

    Service service = new Service(store);

    assertEquals("a", service.label("a").orElseThrow().key());
}
```

```groovy
testImplementation 'org.mockito:mockito-junit-jupiter:5.14.2'
```

```java
@ExtendWith(MockitoExtension.class)
class ServiceTest {
    @Mock
    RowStore store;

    @InjectMocks
    Service service;
}
```

The extension creates the mocks and injects them into the object under test by constructor or field, which
removes the setup boilerplate. Strict stubs are on by default, so a stub that no test used fails the test,
which catches the stub left behind by a change.

## Asserting on interactions

```java
verify(store).save(any(Row.class));
verify(store, never()).delete(anyString());
verify(store, times(2)).find("a");
```

```java
ArgumentCaptor<Row> captor = ArgumentCaptor.forClass(Row.class);
verify(store).save(captor.capture());

assertEquals(128L, captor.getValue().value());
```

`ArgumentCaptor` reads an argument the code under test built, which is how a test asserts on a value that was
passed in rather than returned. It is the alternative to an `equals` implementation written only for a test.

## Where mocking goes wrong

**Mocking a value type.** A `Row` is trivial to construct, so mocking one produces a fake object with no
behaviour that breaks the moment the code calls a method you did not stub.

**Mocking what you do not own.** A mock of a third party client asserts your understanding of its API rather
than its behaviour, so the test passes while the real call fails. Wrap it behind an interface you own and
fake that, or test against the real thing.

**Over-stubbing.** Ten `when` calls to make one method return a value is telling you the unit has too many
dependencies or the fixture is wrong. A fake with sensible defaults removes most of them.

**Asserting only on interactions.** A test that verifies six method calls survives a refactor badly: rename a
method and every test that named it fails, while the behaviour is unchanged. Assert on the returned value or
the state of a fake where you can, and keep `verify` for the interactions that genuinely matter, such as
"the event was published once".

**Verifying what the test itself stubbed.** `when(store.find("a"))` followed by
`verify(store).find("a")` asserts that the code called the method the test told it to call, which the stub
already proves. That is a test with no assertion.

## Throwing from a dependency

```java
when(store.find("a")).thenThrow(new UncheckedIOException(new IOException("unreachable")));

assertThrows(UncheckedIOException.class, () -> service.label("a"));
```

Stubbing an exception is how the failure path gets a test, and those paths are usually where the interesting
bugs are. Test the failure a dependency produces, not one you invented: read what the client documents, then
check the code handles that.

## Do not sleep in a test

```java
verify(store, timeout(1000)).save(any(Row.class));
```

A test that sleeps for a second to wait for a background thread is slow and flaky in equal measure. Mockito's
`timeout` waits with a bound, a `CountDownLatch` or a `CompletableFuture` joins on the work, and a fake can
record the call synchronously. Where none of those apply, the code needs a seam rather than the test needing a
sleep.

## Check yourself

Replace one mock assertion with a hand written fake and an assertion on the fake's state, and note which
version breaks if the interface method changes its name. Then stub an exception, test the failure path, and
check that no test in your suite contains a `Thread.sleep`.
