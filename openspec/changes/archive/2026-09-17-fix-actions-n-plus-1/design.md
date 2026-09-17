## Context

See proposal.md for motivation. Current state: `canTransition()` in `kanban-api/src/domain/lifecycle.ts` shares the `ToDo`/`InProgress` arm so both reach `Blocked`, and `Blocked` returns to any valid `previousState`; `BoardDetailPage.loadBoard()` fetches `GET /boards/:id` (already includes tasks) then `1+N` actions calls plus `M` `GET /users/:id` via `resolveMemberEmails`. Error mapping already distinguishes `board_not_done` / `invalid_transition` / `read_only` as 409s (`middleware/errorHandler.ts`).

## Goals / Non-Goals

**Goals:**
- Single source of lifecycle truth stays in backend; frontend interprets only a static table plus already-loaded entity state.
- Paint a board in 2 requests plus one session-cached table fetch.

**Non-Goals:**
- Touching `GET .../actions` behavior, paginating boards, migrating legacy `Blocked(previousState=ToDo)` data.

## Decisions

### D1: Derive `GET /transitions` from the domain, don't hardcode a second table
Serve the response by reading `lifecycle.ts` states plus `guards.ts` frozen set so the B lifecycle edit changes the endpoint for free. Alternative (static JSON literal in the router) rejected: reintroduces the duplication this change removes.
Response uses canonical `LifecycleState` casing; `Cache-Control: public, max-age=3600`; mounted as a standalone router in `app.ts`; guarded by the existing actor middleware (401 unknown actor).

### D2: Split the `ToDo`/`InProgress` arm; narrow `Blocked`
`canTransition`: `ToDo -> InProgress | Cancelled`; `InProgress -> Done | Blocked | Cancelled`; `Blocked -> InProgress` only when `previousState === InProgress` (legacy `previousState=ToDo` yields no moves, accepted). Alternative (keep `Blocked -> previousState` with `ToDo` removed from entry) rejected: leaves a dead `previousState=ToDo` path and a wider contract than the product wants.

### D3: `POST /users/batch` returns found-only, capped at 100
Body `{ ids: string[] }`; dedupe server-side; unknown ids omitted (frontend already falls back to raw id); `400 validation` on missing/non-array/over-limit; `401` via actor middleware. New repository `findByIds` (`$in` query; in-memory test double filters by id). Alternative `GET ?ids=` rejected: URL length limits and awkward encoding for N ids.

### D4: Frontend keeps an optimistic `Done`, server validates
Board `Done` is shown whenever the table lists it; `handleBoardMove` maps `board_not_done` to a gate message and keeps generic text for `invalid_transition`/`read_only`. `loadTaskMoves`/`boardActions` per-entity calls are deleted; `resolveMemberEmails` calls `batchUsers` once. `FROZEN_BOARD_STATES` constant is deleted in favor of `frozenStates` from the table. Alternative (hide `Done` unless gate passes) rejected: requires a per-board dynamic endpoint, defeating the static-table goal.

## Risks / Trade-offs

- [Optimistic Done rejected at save] → Mitigation: distinct `board_not_done` message; server always authoritative.
- [Transitions fetch fails, all arrows disabled] → Mitigation: preserve existing failed-lookup UX (disabled arrow) keyed on the table fetch.
- [Batch over-fetch / abuse] → Mitigation: 100-id cap, auth required.
- [Legacy stuck entities] → Accepted: no migration; they render with no moves.

## Migration Plan

Ship backend (domain + 2 endpoints) with frontend in one release; old `.../actions` untouched so rollback is revert of this change only. No data migration.

## Open Questions

None. Endpoint shapes, casing, caps, and legacy handling were decided in exploration.
