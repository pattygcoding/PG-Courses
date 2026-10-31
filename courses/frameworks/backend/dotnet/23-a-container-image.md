---
title: A container image for the service
summary: A multi-stage build, a non-root user, and the layer order that makes a rebuild fast.
chapter: Shipping it
minutes: 14
status: draft
---

## Two stages: build, then run

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY *.sln .
COPY src/Shop/*.csproj src/Shop/
RUN dotnet restore

COPY . .
RUN dotnet publish src/Shop/Shop.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Shop.dll"]
```

The SDK image compiles and the runtime image runs, so nothing in the final image carries a compiler. Copying the
project files and restoring before copying the source is what makes a rebuild after a code change skip the
restore step, which is the difference between ten seconds and a minute.

## The base images

| Image          | Use it for                                             |
| -------------- | ------------------------------------------------------ |
| `sdk`          | building                                               |
| `aspnet`       | running a web service                                  |
| `runtime`      | running a console app                                  |
| `runtime-deps` | a self-contained app that still needs native libraries |

The distribution variants change the base OS and the size, and whichever you pick should match between the build
and the run stage so the native libraries are the same.

## Run as a non-root user

```dockerfile
USER $APP_UID
```

The .NET images define `APP_UID`, and switching to it means an escape from the process is not root inside the
container. Some platforms require it and every one is safer with it. A non-root process cannot bind to port 80,
which is why the app listens on 8080 and the platform maps the port.

## Listen where the container expects

```bash
ASPNETCORE_URLS=http://+:8080
```

`+` means every interface, which is what a container needs. Binding to `localhost` produces a container that
starts, logs that it is listening, and refuses every connection from outside, which is a confusing half hour.

## Keep the context small

```gitignore
bin/
obj/
.git/
tests/
```

A `.dockerignore` with those entries keeps the build context small, so the daemon is not sent a gigabyte of
previous builds before it starts.

## Check yourself

Build the image, run it with the port mapped, and call the health endpoint. Then add the `USER` line, confirm it
still works, and compare the image size with the SDK image you built from.
