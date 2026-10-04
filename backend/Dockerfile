# BOF2 API — container image for Render (or any Docker host).
# Build context is this backend/ folder:  docker build -t bof2-api backend

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so this layer is cached until a project file changes.
COPY global.json BOF2.sln ./
COPY BOF2.Domain/BOF2.Domain.csproj BOF2.Domain/
COPY BOF2.Application/BOF2.Application.csproj BOF2.Application/
COPY BOF2.Infrastructure/BOF2.Infrastructure.csproj BOF2.Infrastructure/
COPY BOF2.Api/BOF2.Api.csproj BOF2.Api/
RUN dotnet restore BOF2.Api/BOF2.Api.csproj

COPY . .
RUN dotnet publish BOF2.Api/BOF2.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# ---- run ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app .

# The image runs as the non-root "app" user; it needs a writable uploads folder (only used without Cloudinary).
USER root
# libgssapi-krb5-2: Npgsql may load it while negotiating a connection; without it the process crashes (exit 139).
RUN apt-get update     && apt-get install -y --no-install-recommends libgssapi-krb5-2     && rm -rf /var/lib/apt/lists/*     && mkdir -p /app/uploads && chown -R app:app /app/uploads
USER app

# Render sends traffic to port 10000 by default.
ENV ASPNETCORE_HTTP_PORTS=10000 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_gcServer=0
EXPOSE 10000

ENTRYPOINT ["dotnet", "BOF2.Api.dll"]
