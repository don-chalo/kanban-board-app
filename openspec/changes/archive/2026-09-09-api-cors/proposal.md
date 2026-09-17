## Why

The kanban API is consumed by a browser single-page app (`kanban-front-end`) served from a different origin, but the API currently sends no CORS headers, so the browser blocks reading every response. The front-end login page needs cross-origin access to the API.

## What Changes

- Add the `cors` middleware to the Express app built in `src/app.ts`, permitting requests from any origin (the SPA is the sole client and no credentials or cookies are used).
- Allow preflight `OPTIONS` requests (the SPA will send a custom `X-User-Id` header, which requires a preflight).
- Add tests asserting responses carry `Access-Control-Allow-Origin` and that preflight requests succeed.
- Not breaking: this only adds response headers; existing routes and contract are unchanged.

## Capabilities

### New Capabilities

- `cors`: The API allows browser clients from any origin to call its endpoints and answers preflight `OPTIONS` requests with the headers the SPA needs.

### Modified Capabilities

<!-- none -->

## Impact

- `kanban-api/package.json`: add `cors` and `@types/cors` dependencies.
- `kanban-api/src/app.ts`: mount the CORS middleware before the routers.
- `kanban-api/src/app.test.ts` (or a new route-test file): CORS header and preflight assertions.
- Enables the `kanban-front-end/login` capability to call the API from a different origin.