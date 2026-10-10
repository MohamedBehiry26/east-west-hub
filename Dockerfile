FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY src/backend/ src/backend/
RUN dotnet restore src/backend/SpaceMedia.Api/SpaceMedia.Api.csproj
RUN dotnet publish src/backend/SpaceMedia.Api/SpaceMedia.Api.csproj -c Release --no-restore -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./
USER $APP_UID
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
# Render injects PORT. Keep the process as PID 1 for shutdown signals.
ENTRYPOINT ["sh", "-c", "exec dotnet SpaceMedia.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]
