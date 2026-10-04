# Feedora API — container image for Render (or any Docker host).
# Build context is this backend/ folder:  docker build -t feedora-api backend

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so this layer is cached until a project file changes.
COPY global.json Feedora.sln ./
COPY Feedora.Domain/Feedora.Domain.csproj Feedora.Domain/
COPY Feedora.Application/Feedora.Application.csproj Feedora.Application/
COPY Feedora.Infrastructure/Feedora.Infrastructure.csproj Feedora.Infrastructure/
COPY Feedora.Api/Feedora.Api.csproj Feedora.Api/
RUN dotnet restore Feedora.Api/Feedora.Api.csproj

COPY . .
RUN dotnet publish Feedora.Api/Feedora.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# ---- run ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app .

# The image runs as the non-root "app" user; it needs a writable uploads folder (only used without Cloudinary).
USER root
RUN mkdir -p /app/uploads && chown -R app:app /app/uploads
USER app

# Render sends traffic to port 10000 by default.
ENV ASPNETCORE_HTTP_PORTS=10000 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_gcServer=0
EXPOSE 10000

ENTRYPOINT ["dotnet", "Feedora.Api.dll"]
