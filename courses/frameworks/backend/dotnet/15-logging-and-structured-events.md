---
title: Logging and structured events
summary: ILogger, message templates, scopes, and the fields that make a log searchable.
chapter: Production concerns
minutes: 12
status: draft
---

## The logger comes from the container

```csharp
public sealed class OrderService(ILogger<OrderService> log)
{
    public async Task<Order> CreateAsync(OrderRequest request, CancellationToken token)
    {
        log.LogInformation("creating order for {Email}", request.CustomerEmail);

        var order = new Order(request);
        await _repository.AddAsync(order, token);

        log.LogInformation("created order {OrderId} for {Email}", order.Id, request.CustomerEmail);

        return order;
    }
}
```

The generic parameter names the category, which is where the log line came from. Levels come from
configuration, so the same code is quiet in production and verbose in development.

## Templates, not interpolation

```csharp
log.LogInformation("order {OrderId} created for {Email}", order.Id, order.Email);
log.LogInformation($"order {order.Id} created");
```

The first form keeps the values separate from the message, so the sink indexes `OrderId` and you can query for
one order's lines. The second flattens everything into a string that no query can take apart, and it builds the
string even when the level is disabled.

## Levels, and what each is for

| Level       | Use it for                                            |
| ----------- | ----------------------------------------------------- |
| Trace       | per-item detail you would only enable for one request |
| Debug       | diagnostics for whoever is reading the code           |
| Information | milestones worth keeping in normal running            |
| Warning     | something unexpected that the code handled            |
| Error       | an operation failed                                   |
| Critical    | the process cannot continue                           |

The distinction that matters is Warning against Error. A handled retry is a warning, and logging it as an error
is how a real failure gets lost in the noise.

## Scopes carry the correlation

```csharp
using (log.BeginScope(new Dictionary<string, object> { ["OrderId"] = order.Id }))
{
    log.LogInformation("validated");
    log.LogInformation("saved");
    log.LogInformation("notified");
}
```

Every line inside the scope carries the order id, so the field is written once. A middleware can do the same for a
request id, which is what ties three lines from three classes to one request.

## Where the logs go

The console by default, which is what a container platform collects. Keep the destination in configuration
rather than in code, and write JSON in production so the properties survive the trip. A log line that only reads
well in a terminal becomes a line nobody can search once it is in a store.

## Check yourself

Add logging at three levels to a handler, set the level through configuration, and restart with a different
setting. Then add a scope and confirm every line inside it carries the same property.
