## Context

The API is a small Express app assembled in `src/app.ts` (`buildApp`), with JSON parsing, routers, and an error handler. There is currently no CORS handling at all. The front-end SPA served from another origin must be able to read API responses, and its future custom `X-User-Id` header triggers preflight. See `proposal.md` for motivation; the concrete contract is `specs/cors/spec.md`.

## Goals / Non-Goals

**Goals:**
- Enable cross-origin reads from any origin via standard CORS response headers.
- Answer preflight `OPTIONS` requests so the SPA can send `Content-Type` and a custom `X-User-Id` header.

**Non-Goals:**
- Restricting or whitelisting specific origins (the API is unauthenticated and open; a fixed allowlist adds no security here).
- Supporting credentialed requests (no cookies are used).
- Changing any route or response body.

## Decisions

- **Use the `express`-style `cors` middleware package** rather than hand-writing header logic. The package handles `Access-Control-Allow-Origin`, reflected requested methods/headers, and preflight responses correctly for edge cases (e.g., `OPTIONS` with no body, non-preflight `OPTIONS`).
  - Alternatives: hand-rolled middleware (more code, easy to get preflight corner cases wrong); `vite` dev proxy (rejected: the user explicitly wants browser→API CORS access, and it would not help once the SPA is hosted separately from the API).
- **Allow all origins (`cors()` defaults)** instead of `origin: true` + credentials. The API has no credentials to protect (`email` identity is self-declared), so `Access-Control-Allow-Origin: *` is sufficient and simplest.
- **Mount early in `buildApp`**, before the routers, so every response path (including errors and 404s) carries the headers.
- **Add `@types/cors`** as a dev dependency for TypeScript.

## Risks / Trade-offs

- [Open CORS lets any website read public API responses] → Acceptable: the API is unauthenticated and its data carries no account secrets; identity-by-email is not a security boundary.
- [CORS preflight doubles some requests (OPTIONS before real request)] → Negligible for a low-traffic personal app; the `cors` package answers preflights directly.
- [Middleware order error would leak headers on some routes] → Covered by the integration test asserting the header on a representative route.

## Migration Plan

- Add the dependency, mount the middleware, add tests, run the full suite. No data migration. Rollback: remove the middleware import/use and the dependency.

## Open Questions

None.