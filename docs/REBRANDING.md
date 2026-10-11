# East West Hub rebranding verification

The solution and all five backend projects are now `EastWestHub`: Api, Application, Domain, Infrastructure and Tests. Namespaces, project references, embedded-resource names, DbContext/factory/snapshot, test hosts and Docker startup paths were updated together. Angular package/project identifiers are `east-west-hub-web`.

## Database safety

All 13 existing migration IDs and their order are unchanged. Migration namespaces and CLR model metadata were renamed consistently; no migration was added and no table, column or Identity schema was renamed. The current relational model matches the renamed snapshot.

Offline idempotent SQL generation before and after the refactor produced byte-identical files, also matching the reviewed staging artifact. SHA-256:

`97ACB9FF942794BFAC8196D2C6E4EE7C6DC16D9CE53B78A50985CE0EAC9E71A9`

No database was contacted or modified for this verification. Existing staging data requires no migration for this change. Production/Staging startup does not apply migrations automatically. Do not change its environment to Development.

## Deliberately retained compatibility references

- `dist/space-media-web/browser` remains the Cloudflare Pages build output. Angular configuration, wrangler, the CSS regression test and deployment documentation retain this deployment contract.
- `space-media-admin-locale` remains a read-only localStorage fallback, with regression tests, so returning administrators retain their language. New preferences use `east-west-hub-admin-locale`.
- This report mentions old names to document the audit. Git history is unchanged.
- The physical checkout path, ignored work artifacts and old ignored build/cache files can retain legacy names. They are not release source or staged files. An old API build directory was left alone because generated files were locked by an existing process; no process or local secret configuration was altered.

Localhost URLs and the dummy `.env.example` connection remain local development examples. The hosted app has no database connection fallback; outside Development it requires a signing key, explicit AllowedHosts, HTTPS AllowedOrigins and HTTPS PublicSite base URL. Existing local databases and user secrets were not renamed. UserSecretsId remains unchanged.

## SnapDeploy settings

Use the repository root as build context and the root Dockerfile. Runtime entrypoint is `EastWestHub.Api.dll`; remove a custom start-command override referencing the old DLL. Keep port 8080 and provider-managed PORT unchanged. The public CA remains `/etc/ssl/certs/supabase-prod-ca-2021.crt`; use Npgsql VerifyFull and this container path for any explicit Root Certificate setting.

Preserve existing private connection, JWT key, issuer and audience values. If the prior deployment relied on defaults, explicitly retain `Jwt__Issuer=SpaceMedia.Api` and `Jwt__Audience=SpaceMedia.Admin` before deploying to preserve existing tokens. These are compatibility identifiers, not secrets. New installations can use the EastWestHub values documented in FREE-STAGING.md. No credential rotation is part of this refactor.

Bootstrap credentials require at least 12 characters, uppercase, lowercase, digit and symbol. Invalid email, incomplete configuration or weak passwords now fail clearly without echoing inputs, before role/account writes. Existing accounts and passwords remain intact.

See [FREE-STAGING.md](FREE-STAGING.md) for all runtime variable names and staging steps. Keep the dedicated staging Supabase Data API disabled. No CI workflow or tracked deployment script was present to rename.

## Verified checks

- .NET restore, Release build (zero warnings/errors), Release publish: passed.
- Backend tests: 81 passed, including bootstrap validation, exact migration IDs and snapshot compatibility.
- Angular tests: 93 passed; Pages staging tests: 5 passed; production CSS regression: 1 passed.
- Angular production build: passed. Initial bundle 499.97 kB remains below 500 kB; existing admin-shell CSS warning remains (6.45 kB versus 4 kB).
- Docker references, .NET 10 images, certificate source and published entrypoint were checked offline. Docker CLI is unavailable, so no container build/runtime or hosted TLS test is claimed.

No live database, physical-browser, deployment or infrastructure verification was performed.
