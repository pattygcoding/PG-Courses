---
title: Spring Boot
level: Intermediate
summary: Build, test and ship a Spring Boot service, from the application context and the HTTP layer to JPA, security and a container image.
labels:
  - Framework
  - Backend
  - Spring
minutes: 18
status: draft
---

## What this course is

Spring Boot is the framework most Java services are written in. It gives you an application context that
wires objects together, a web layer built on Spring MVC, a data layer over JPA, and a packaging step that
produces something you can run and deploy. This course covers the server side: how the pieces are
configured, how a request travels through them, and how the result is operated.

The language has its own course. This one assumes you can write Java and stays on the framework:
starters and auto-configuration, controllers, validation, JPA and transactions, security, testing, and
the container image that ships.

## Who it is for

You can write Java and want to ship a service with it, or you have a Spring Boot service to maintain and
want to understand how its configuration and its request path fit together before you change them.

## What you will build

An HTTP API with validated endpoints, a service layer behind an interface, a JPA data layer with
migrations, error responses that match the problem details format, tests that run against a real
database in a container, and a layered jar in an image that starts with a health check.

## Prerequisites

A JDK, a terminal, and working Java. The data and shipping chapters use Docker. Familiarity with HTTP
helps, and nothing here assumes you have written a server before.

## How the pages are ordered

The pages start with the application context and dependency injection, because every later page is
configured through them. Then they work through the HTTP layer, data access, configuration and security,
observability and testing, and finish with packaging and deployment. Each page leaves you with a service
you can start.
