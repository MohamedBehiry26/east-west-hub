FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY src/backend/ src/backend/
RUN dotnet restore src/backend/EastWestHub.Api/EastWestHub.Api.csproj
RUN dotnet publish src/backend/EastWestHub.Api/EastWestHub.Api.csproj -c Release --no-restore -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./
# Public CA only; Npgsql uses this explicit trust anchor for Supabase TLS.
COPY --chmod=0444 deployment/certs/supabase-prod-ca-2021.crt /etc/ssl/certs/supabase-prod-ca-2021.crt
USER $APP_UID
ENV ASPNETCORE_ENVIRONMENT=Production
ENV PGSSLROOTCERT=/etc/ssl/certs/supabase-prod-ca-2021.crt
EXPOSE 8080
# Hosting providers inject PORT. Keep the process as PID 1 for shutdown signals.
ENTRYPOINT ["sh", "-c", "exec dotnet EastWestHub.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]
