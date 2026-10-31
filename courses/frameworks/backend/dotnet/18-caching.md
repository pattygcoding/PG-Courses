---
title: Caching
summary: Output caching, memory caching, and the invalidation that has to be designed rather than hoped for.
chapter: Production concerns
minutes: 13
status: draft
---

## Cache the finished response

```csharp
builder.Services.AddOutputCache(options =>
{
    options.AddPolicy("Catalog", policy => policy
        .Expire(TimeSpan.FromMinutes(5))
        .SetVaryByQuery("page", "sort"));
});

var app = builder.Build();

app.UseOutputCache();

app.MapGet("/catalog", CatalogAsync).CacheOutput("Catalog");
```

Output caching stores the response, so a repeat request skips the handler and the database behind it. The
`SetVaryByQuery` call is the correctness question in one line: two requests with different `page` values must not
receive each other's response.

## What must never be cached

A response that varies by a token, anything under a path that returns the caller's own data, and anything varying
by a header you did not list. A cached response served to the wrong caller is a data leak, so the safe default is
to leave authenticated endpoints uncached and cache the public, shared ones.

## Cache a value in memory

```csharp
builder.Services.AddMemoryCache();

public sealed class RateProvider(IMemoryCache cache, HttpClient http)
{
    public async Task<decimal> GetAsync(string pair, CancellationToken token)
    {
        var key = $"rate:{pair}";

        if (cache.TryGetValue<decimal>(key, out var cached))
        {
            return cached;
        }

        var rate = await http.GetFromJsonAsync<decimal>($"/rates/{pair}", token);
        cache.Set(key, rate, TimeSpan.FromMinutes(1));

        return rate;
    }
}
```

`IMemoryCache` holds the value in this process, so each instance keeps its own copy and a miss does the work
again. `IDistributedCache` is the option when instances must agree, and it costs a round trip to whatever backs
it. Both are interfaces so a test can replace them.

## Expiry is the design decision

A cache with no expiry is a bug with a delay, and an expiry length is a statement about how stale a value is
allowed to be. Keep it short for anything a person acts on, and invalidate the key in the same code path as the
write when a read must reflect it immediately. A distributed cache needs that invalidation to reach every
instance, which is the part people discover late.

## Check yourself

Cache an endpoint for ten seconds, change the data behind it, and confirm the cached response is served until it
expires. Then add a second varied query parameter and explain what went wrong without it.
