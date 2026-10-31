---
title: Configuring the web layer
summary: CORS, interceptors, the server settings worth knowing, and what to change when the service runs behind a proxy.
chapter: Configuration and security
minutes: 13
status: draft
---

## WebMvcConfigurer is the hook

```java
@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://app.example.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("Content-Type", "Authorization");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new RequestLogInterceptor()).addPathPatterns("/api/**");
    }
}
```

`WebMvcConfigurer` is the supported way to extend the framework's web configuration without replacing it. The
methods cover CORS, interceptors, argument resolvers, message converters and the path matching options.

## CORS is the browser asking your permission

A page served from `https://app.example.com` calling this service on another host is a cross origin request, and
the browser checks the response headers before letting the page read the answer. Spring adds them for the
origins you allow.

```java
@CrossOrigin(origins = "https://app.example.com")
@GetMapping("/{key}")
public RowResponse get(@PathVariable String key) { }
```

The annotation is fine for one endpoint and unreadable across thirty, which is why the registry above is the
better place. Three things go wrong with CORS:

- `allowedOrigins("*")` with credentials is rejected by the browser, so an authenticated application names its
  origins.
- A `POST` with a JSON content type triggers a preflight `OPTIONS` request, which needs the method and headers
  listed or the browser blocks the real request.
- Spring Security has its own CORS handling, so a security configuration that ignores CORS answers the preflight
  with a 401. Calling `http.cors(...)` with the same source is the fix.

## Server settings worth knowing

```yaml
server:
  port: 8080
  address: 0.0.0.0
  shutdown: graceful
  compression:
    enabled: true
    mime-types: application/json
  max-http-request-header-size: 16KB
  forward-headers-strategy: framework
  tomcat:
    threads:
      max: 200

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
  threads:
    virtual:
      enabled: true
```

`server.shutdown: graceful` stops accepting new requests and waits for the in-flight ones up to the timeout,
which is what makes a rolling deploy invisible. `forward-headers-strategy: framework` makes the service trust
the `X-Forwarded-*` headers a load balancer sets, so a redirect and a logged client address are the ones the
user sees rather than the proxy's.

`spring.threads.virtual.enabled: true` runs each request on a virtual thread, which is the setting that lets a
service with blocking database and HTTP calls handle far more concurrent requests without sizing a pool. It
changed the default in Boot 3.2 and is worth turning on when the work is mostly waiting.

## Filters and interceptors

| | Runs | Sees |
| --- | --- | --- |
| `Filter` | outside the dispatcher, on every request | the raw request and response |
| `HandlerInterceptor` | inside the dispatcher, once a handler is chosen | the handler and the model |

A filter is what a cross cutting concern needs: a correlation identifier, a request size limit, an authentication
check that must run before routing. An interceptor is for something that needs to know which controller will
answer.

```java
@Component
public class CorrelationFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String id = Optional.ofNullable(request.getHeader("X-Request-Id"))
                .orElseGet(() -> UUID.randomUUID().toString());

        MDC.put("requestId", id);
        response.setHeader("X-Request-Id", id);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

`OncePerRequestFilter` guards against the double invocation that a forward or an error dispatch can cause, and
the `finally` is what stops a pooled thread carrying the identifier into the next request.

```java
static final int ORDER = Ordered.HIGHEST_PRECEDENCE + 10;
```

Filter order matters: a security filter that runs after your own has already let the request through. Spring
Security's chain has a defined position, and `@Order` plus `SecurityProperties.DEFAULT_FILTER_ORDER` is how a
filter is placed relative to it.

## Limits on what a request can contain

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB
```

An upload endpoint with no limit accepts a body as large as the heap. The multipart settings cover file uploads
and `server.max-http-request-header-size` covers the headers; the body size for a JSON endpoint is a reverse
proxy setting or a filter.

## Static files and templates

```text
src/main/resources/
  static/index.html          served at /
  public/logo.svg             served at /logo.svg
  templates/report.html       rendered by Thymeleaf when it is on the classpath
```

The `static` directory is served directly, which is enough for a favicon and a health page. A JSON API uses
neither of the last two, and a project that has them and no view is worth a look at the build file.

## Check yourself

Add a CORS mapping for one origin and call the endpoint from a page on another host, reading the response
headers. Then add a filter that sets a correlation identifier, log it, and confirm the same value appears on
every line for one request.
