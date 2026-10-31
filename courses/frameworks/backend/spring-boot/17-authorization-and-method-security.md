---
title: Authorization and method security
summary: Roles, the rules that read them, and the ownership check a role cannot express.
chapter: Configuration and security
minutes: 13
status: draft
---

## Authorities are strings with a convention

```java
.authorizeHttpRequests(authorize -> authorize
        .requestMatchers(HttpMethod.GET, "/api/rows/**").hasAuthority("ROLE_READER")
        .requestMatchers(HttpMethod.POST, "/api/rows").hasAuthority("ROLE_EDITOR")
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .anyRequest().authenticated())
```

`hasRole("ADMIN")` looks for the authority `ROLE_ADMIN`, and `hasAuthority("ROLE_ADMIN")` looks for that exact
string. Mixing the two is the most common cause of a rule that never matches, and the debug logging names the
authorities the caller had.

| Rule | Means |
| --- | --- |
| `permitAll()` | anyone, including an unauthenticated caller |
| `authenticated()` | any authenticated caller |
| `hasRole("X")` | the authority `ROLE_X` |
| `hasAnyRole("X", "Y")` | either of two roles |
| `denyAll()` | nobody, for a path not yet implemented |

Ordering matters and the first match wins, so the specific method and path combinations go above the broad
patterns. A rule after `anyRequest()` is unreachable and the framework warns at start-up.

## Method security puts the rule on the code

```java
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfiguration { }
```

```java
@Service
public class RowService {

    @PreAuthorize("hasRole('EDITOR')")
    public Row create(CreateRowRequest request) { }

    @PreAuthorize("#key == authentication.name or hasRole('ADMIN')")
    public Row find(String key) { }
}
```

`@PreAuthorize` takes a SpEL expression evaluated before the method runs, with the parameters available by name,
and `@PostAuthorize` runs after and can read the result as `returnObject`. `@PreFilter` and `@PostFilter` filter
a collection argument or result, which is rarely what you want because it silently changes what the caller
received.

The advantage over a URL rule is that the decision sits next to the method and cannot be bypassed by a second
entry point that forgot the URL pattern. A scheduled job or a message listener calling the method gets the same
check.

## Roles are not enough for ownership

```java
@PreAuthorize("@ownership.canRead(#key, authentication)")
public Row find(String key) { }
```

```java
@Component("ownership")
public class OwnershipGuard {
    private final RowRepository rows;

    public boolean canRead(String key, Authentication who) {
        if (who.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
            return true;
        }

        return rows.findByKey(key)
                .map(row -> row.owner().equals(who.getName()))
                .orElse(false);
    }
}
```

"Can this caller see this particular row" depends on the data, so a role cannot answer it. A named bean called
from the expression keeps the rule testable on its own and out of the service, and the service stays about the
rules rather than about who is asking.

A rule of this shape is worth checking against the alternative: if every caller of the method is allowed to see
everything, the check belongs in the query. Adding the owner to the `where` clause is faster and cannot be
forgotten.

## Tokens from an identity provider

```groovy
implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
```

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://identity.example.com/
```

With that setting the service fetches the issuer's keys at start-up, checks the signature and the claims of every
bearer token, and builds an `Authentication` from it. Nothing in the application validates a token by hand.

```java
@Bean
JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
    authorities.setAuthoritiesClaimName("roles");
    authorities.setAuthorityPrefix("ROLE_");

    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(authorities);

    return converter;
}
```

By default the scopes claim becomes the authorities with a `SCOPE_` prefix, so a service using roles has to say
where they are. A claim that arrives as a string rather than a list is the other reason a token gets no
authorities and every rule fails.

## Testing it

```java
@WebMvcTest(RowController.class)
class RowControllerSecurityTest {

    @Test
    @WithMockUser(roles = "EDITOR")
    void anEditorMayCreate() throws Exception {
        mockMvc.perform(post("/api/rows").content("{}").contentType(APPLICATION_JSON))
                .andExpect(status().isCreated());
    }

    @Test
    void anAnonymousCallerIsRejected() throws Exception {
        mockMvc.perform(post("/api/rows").content("{}").contentType(APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
```

`@WithMockUser` puts a fake authentication in the context, which is enough for a rule that reads roles. A test
of a token is `@WithMockUser` with the authorities the token would have, or a real signed token from the test
issuer when the claim mapping is what is under test.

The two tests worth having on every protected endpoint are the one that passes and the one that must not, since a
rule that permits everything passes the first and is caught by the second.

## Check yourself

Add one URL rule and one `@PreAuthorize` method rule, then call each as an allowed and a forbidden caller and read
the status code. Then move one rule into an ownership bean and test it with two accounts.
