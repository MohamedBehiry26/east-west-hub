# Admin authentication

## API

- `POST /api/auth/login` accepts an email and password and returns a short-lived JWT for an active administrator.
- Invalid credentials, locked accounts, and non-admin accounts receive the same `401` response.
- `GET /api/admin/session` is a protected example endpoint. It returns only the authenticated administrator's email and display name.
- Authorization uses the `Admin` role. The API has a fallback policy requiring authentication; explicitly mark future public endpoints `[AllowAnonymous]`.
- Unconfirmed email is rejected. Bootstrap-created administrator accounts are marked confirmed because there is no email-confirmation flow yet.
- Passwords are stored using ASP.NET Core Identity's password hasher. The policy requires at least 12 characters, upper/lowercase, a digit, and a non-alphanumeric character. Five failed attempts lock an account for 15 minutes.
- No public registration or refresh-token endpoint exists.

## Bootstrap an administrator

Apply the database migrations first in production. With a configured PostgreSQL connection, application startup ensures the `Admin` role exists. To create an initial administrator, set both `AdminBootstrap__Email` and `AdminBootstrap__Password` through the deployment secret store (or local shell). Identity validates the password policy and stores only a password hash. Remove the bootstrap variables after the initial account is created.

Development startup applies pending migrations automatically only in `Development`. Production startup does not migrate the schema; it assumes deployment migrations have already run.

## JWT configuration

Set `Jwt__Key` to a unique, random value of at least 32 UTF-8 bytes. Keep it in a secret store and rotate it if exposed. Set `Jwt__Issuer` and `Jwt__Audience` consistently for the API. Tokens expire after 15 minutes by default; configuration permits 1–60 minutes. Missing keys cause startup to fail outside Development. Development can use an ephemeral random key when none is configured; tokens signed by it stop validating after restart.

The API validates signature, issuer, audience, and expiry, and accepts the token only through the `Authorization: Bearer` header. Do not place the signing key or administrator password in Angular configuration.

## Angular token handling

Angular keeps the access token only in an in-memory signal and adds it to API requests through an HTTP interceptor. It does not write the token to `localStorage`, `sessionStorage`, cookies, or persistent browser storage. A page reload clears the session and requires another sign-in. Sign out clears the local token; because access tokens are stateless, a previously copied token remains valid until its short expiry. Refresh and server-side revocation are not implemented in this phase.

The Angular route guard improves navigation flow; API role authorization remains the security boundary.
