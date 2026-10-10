# SnapDeploy: Supabase PostgreSQL TLS

Build using the root `Dockerfile` with the repository root as the Docker build context. The existing .NET 10 SDK/runtime images, non-root user, startup command, and `PORT` binding (default 8080) are preserved.

The final runtime image contains the public Supabase Root 2021 CA at:

`/etc/ssl/certs/supabase-prod-ca-2021.crt`

Its repository source is `deployment/certs/supabase-prod-ca-2021.crt`. This is a public CA certificate, not a client certificate or private key. The SHA-256 of the original PEM file is:

`700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7`

The Dockerfile sets the non-secret `PGSSLROOTCERT` environment variable to the container path. Npgsql supports this environment variable as the default root certificate location; no global CA-store modification is required.

In SnapDeploy's private runtime environment configuration:

- Keep the existing `ConnectionStrings__DefaultConnection` secret and other application secrets outside Git and the image.
- Set its `SSL Mode` parameter to `VerifyFull` to validate both the certificate chain and the pooler hostname.
- If its `Root Certificate` parameter is already present, replace any Windows or Render-specific path with `/etc/ssl/certs/supabase-prod-ca-2021.crt`. An explicit connection parameter overrides `PGSSLROOTCERT`; otherwise the image default is sufficient.
- Keep the actual Supabase pooler hostname as `Host`; do not substitute an IP address.
- Do not set `Trust Server Certificate=true`, disable validation, or provide secrets as Docker build arguments.

No application code, database configuration, credentials, migrations, or deployment are changed by this certificate packaging update. A container build and a live TLS/authentication smoke test still require a Docker engine or the hosted build environment; offline validation does not prove a live database connection.

References: [Npgsql security](https://www.npgsql.org/doc/security.html), [SnapDeploy environment variables](https://snapdeploy.dev/docs/environment-variables).
