## Context

See proposal.md for motivation. `loadConfig()` in `kanban-api/src/config.ts` strictly parses `DATABASE_URL`/`DEFAULT_PORT`; `buildApp({userRepo, boardRepo})` wires `app.use(cors())` with permissive defaults and is called from `index.ts` plus six test call sites; `cors.test.ts` asserts the current any-origin behavior. No frontend changes.

## Goals / Non-Goals

**Goals:**
- Configured origin list with fail-closed default, no test call-site churn.

**Non-Goals:**
- Cookie/`credentials` support (front uses `X-User-Id`), per-route CORS rules.

## Decisions

### D1: `CORS_ORIGIN` parsed in `loadConfig`, optional in `buildApp`
`corsOrigin: string[]` joins `AppConfig` (split on comma, trim, drop empties; absent → `[]`). `buildApp` gains an optional second parameter so existing callers compile untouched; `index.ts` passes the parsed list. Alternative (required param) rejected: needless churn across six test call sites.

### D2: Delegate to the `cors` package with a function origin
`origin: (origin, cb) => !origin ? cb(null, true) : cb(null, allowed.includes(origin))` — the library emits the echo plus `Vary: Origin` and handles preflight; hand-rolled headers rejected. Empty list therefore denies cross-origin reads while same-origin and Origin-less clients pass through.

## Risks / Trade-offs

- [Local dev breaks without `.env` entry] → Mitigation: documented `CORS_ORIGIN=http://localhost:5173` in README; the failure mode (browser-blocked reads) is loud, not silent.
- [`*` no longer available] → Accepted: an explicit list covers the legitimate cases; credentials would have forced this anyway.

## Migration Plan

Single backend release; operators set `CORS_ORIGIN` (or accept same-machine-only). Rollback is revert.

## Open Questions

None. Name, parsing, default, and list shape were decided in exploration.
