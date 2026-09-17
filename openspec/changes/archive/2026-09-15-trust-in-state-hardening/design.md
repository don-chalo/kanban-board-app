## Context

`kanban-api/src/domain/commands.ts:26` `createTask` checks only `Cancelled|Done`, so `Blocked` accepts new tasks while `BoardDetailPage` disables `+ NEW TASK` on frozen. `boardsRouter.ts:45` `PATCH /boards/:boardId` forwards `title` raw with no trim/blank check, unlike `POST /boards` (`:26`) and `PATCH /tasks/:taskId` (trim + `400`). `boardRepo.ts:20` is load-mutate-`replaceOne`, no version. See proposal.md — Why.

## Goals / Non-Goals

**Goals:**
- Make frozen semantics uniform: every mutation except board `description` edit rejected on `Blocked`/`Cancelled`/`Done`.
- Make blank board titles impossible via any endpoint, trimmed on write.
- Record concurrency/auth limits without solving them here.

**Non-Goals:**
- Optimistic concurrency / version field (deferred follow-up).
- Real auth tokens (deferred; `X-User-Id` stays).
- Frontend changes (already correct: creation disabled on frozen, blank title rejected inline).

## Decisions

**D1: `createTask` uses `isBoardFrozen`.**
- Replace `board.state === Cancelled || board.state === Done` with `isBoardFrozen(board)` throwing `DomainError("read_only")`. Reuses existing guard + `409` mapping. Alternative keep-`Blocked`-writable rejected: inconsistent with `isEditable` freeze and UI; unblocking restores creation so window is short.

**D2: Title trim + blank reject in `boardsRouter` PATCH.**
- If `body.title` is a string: `trim()`; empty → `ApiError("validation")` (`400`) before any `manageBoard` call, so no partial apply. Non-blank → pass trimmed value to `editAttributes`. Mirrors `tasksRouter.ts:51-56`. Alternative validate in domain: rejected — routers own string hygiene in this codebase, domain receives clean values; keeps `DomainError` codes for state/role only.
- `description` untouched (free-form, blank allowed). `owner` path unchanged and runs after attributes; a `400` on title aborts before owner step, preserving atomicity.

**D3: Concurrency/auth documented, not built.**
- `saveBoardAggregate` race and `X-User-Id` spoofing noted as known limits in Risks. Version-field migration + token auth each deserve their own change (migration + client contract). No code here to keep this change small and reviewable.

## Risks / Trade-offs

- **Clients creating on `Blocked` now get `409`** → Mitigation: UI already disables the button; error contract unchanged (`read_only`).
- **Clients sending padded titles see trimmed storage** → Mitigation: matches `POST /boards` + task PATCH precedent; tests assert trim.
- **Race still possible** → Mitigation: documented; single-board single-manager usage typical; follow-up can add `version`.
- **Header auth still spoofable** → Mitigation: local-dev assumption recorded; no new exposure.

## Migration Plan

No migration. Deploy API only. Rollback: revert two guards; no persisted state to clean.

## Open Questions

- None.
