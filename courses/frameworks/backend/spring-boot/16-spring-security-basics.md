---
title: Spring Security basics
summary: The filter chain, where passwords are hashed, and the three ways a service authenticates a caller.
chapter: Configuration and security
minutes: 14
status: draft
---

## Adding the starter secures everything

```groovy
implementation 'org.springframework.boot:spring-boot-starter-security'
```

That one line makes every endpoint require authentication, generates a random password at start-up, prints it to
the log, and adds a login page. The generated password is a development convenience and a production risk, and
finding it in a log is the moment to configure the chain.

```java
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/actuator/health").permitAll()
                        .anyRequest().authenticated())
                .httpBasic(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        return http.build();
    }
}
```

Spring Security is a chain of servlet filters. Each one does one job: reads a credential, builds an
`Authentication`, checks an authorization rule, writes a 401 or a 403. A `SecurityFilterChain` bean describes the
chain, and there can be more than one for different paths.

`authorizeHttpRequests` is evaluated in order and the first match wins, so a broad `permitAll` before a narrow
rule makes the narrow rule dead. Put the specific paths first and the `anyRequest` last.

## Passwords are hashed, never stored

```java
@Bean
PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
}
```

The delegating encoder writes the algorithm into the hash, so a stored password records how it was hashed and a
newer algorithm can be introduced without a migration. BCrypt is the default and is a reasonable choice.

```java
String hash = passwordEncoder.encode(rawPassword);
boolean matches = passwordEncoder.matches(rawPassword, hash);
```

Never compare password strings with `equals`, never store one in plain text, and never log one. A hash makes a
database dump useless for signing in, which is the point.

## Finding the user

```java
@Service
public class AccountUserDetailsService implements UserDetailsService {
    private final AccountRepository accounts;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return accounts.findByUsername(username)
                .map(account -> User.withUsername(account.username())
                        .password(account.passwordHash())
                        .authorities("ROLE_USER")
                        .disabled(!account.active())
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("no account: " + username));
    }
}
```

The framework calls that method with whatever the request supplied and compares the password it returns with the
one from the request. The `UserDetails` object carries the authorities, which is what the authorization rules
read next.

## Three ways to authenticate

| Mechanism | State | Best for |
| --- | --- | --- |
| Form login with a session | a `JSESSIONID` cookie | a server rendered application |
| HTTP basic | none, the password is sent every request | an internal tool over TLS |
| A bearer token, usually a JWT | none | an API called by another service or a single page app |

A stateless API disables the session and the CSRF protection:

```java
.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
.csrf(csrf -> csrf.disable())
```

## CSRF is about cookies, not about tokens

Cross site request forgery works because a browser attaches cookies to a request from any site, so a page on
another domain can cause an authenticated form submission. Spring's protection requires a token with each state
changing request, which a form must include.

An API that authenticates with a bearer token in a header is not vulnerable, because the header is not attached
automatically, so `csrf.disable()` is correct there. A browser application with a session cookie keeps CSRF on
and sends the token. Disabling it on a cookie based application is the mistake that turns a working application
into one that can be made to transfer money by visiting a page.

## Answers that match the rest of the API

```java
http.exceptionHandling(handling -> handling
        .authenticationEntryPoint((request, response, failure) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/problem+json");
            response.getWriter().write("{\"title\":\"Unauthorized\",\"status\":401}");
        }));
```

The defaults are a login redirect and an HTML error page, which a JSON client cannot parse. Giving the chain an
entry point and an access denied handler makes the 401 and the 403 match the shape the error handling page
established.

A 401 means the caller has not authenticated and a 403 means they have and may not do this. Returning a 401 for
a permission failure sends the client to sign in again, which will not help.

## What the defaults already do

The headers Spring Security adds are worth leaving alone: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, a `Cache-Control` that stops a browser caching a protected page, and HSTS over TLS. The
session fixation protection that changes the session identifier on login is on by default too. Turning any of
them off should be a decision with a reason in the commit message.

```yaml
logging:
  level:
    org.springframework.security: DEBUG
```

That logging level prints the filter chain at start-up and each rule as it is evaluated, which is the fastest way
to find why a request is being rejected.

## Check yourself

Add the starter to a service and find the generated password in the log. Then declare a chain that permits the
health endpoint and requires authentication for everything else, and check both with `curl -i`. Confirm that an
unauthenticated call gets a 401 and that a call with the right password gets the body.
