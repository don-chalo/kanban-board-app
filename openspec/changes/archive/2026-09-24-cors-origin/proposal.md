## Why

The API currently answers `Access-Control-Allow-Origin: *` to every origin, which blocks split-machine deployments from restricting browser access to known frontends. Making the allowed origins configurable (fail-closed) enables locked-down deployments without changing development behavior once `.env` is set.

## What Changes

- New optional `CORS_ORIGIN` environment variable holding a comma-separated list of allowed origins (e.g. `https://app.ejemplo.com,https://preview.ejemplo.com`); parsed in `loadConfig` with trimming and empty-entry filtering.
- `buildApp` accepts an optional options parameter carrying the list; the `cors` middleware echoes only listed origins (with `Vary: Origin`) and requests without an `Origin` header (curl, tests, native apps) always pass.
- When `CORS_ORIGIN` is absent or empty, no cross-origin response carries `Access-Control-Allow-Origin`: browsers block cross-origin reads (same-machine only), while same-origin and non-browser clients are unaffected.
- Local development requires `CORS_ORIGIN=http://localhost:5173` in `kanban-api/.env` (documented); README gains the split-machine setup.

## Capabilities

### New Capabilities

None. All behavior tightens an existing capability.

### Modified Capabilities

- `cors`: allowed origins become configured instead of any-origin, fail-closed when unconfigured.

## Impact

- Backend only: `kanban-api/src/config.ts` (parse), `src/app.ts` (optional options), `src/index.ts` (wiring), `cors.test.ts` + `config.test.ts` coverage, README `.env` docs.
- No API contract changes beyond the CORS headers; no frontend changes.
