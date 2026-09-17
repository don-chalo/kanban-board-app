## Context

`Task` today is `id, boardId, creator, owner, title, description, state, previousState, priority` (`kanban-api/src/domain/entities.ts:18-28`, mirrored in `kanban-front-end/src/lib/api.ts` and `kanban-api/src/models/index.ts` + `mappers/task.mapper.ts`). `moveTask` (`commands.ts:53-71`) authorizes, checks `isEditable`, checks `canTransition`, then `applyStateTransition`. `PATCH /:taskId` (`tasksRouter.ts:52-74`) builds a `title/description/priority` patch and calls `editTask`; the state-move route (`POST /:taskId/state`) calls `moveTask`. `TaskCard.tsx` renders title + state + priority badge bottom-left + avatar bottom-right with `pb-8` reserving the bottom strip. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Add `startedAt: string | null` end-to-end with `null` default and `missing -> null` read fallback.
- Stamp exactly once on `ToDo -> InProgress` when `null`; never overwrite; historical `null` stays dateless.
- Show `YYYY-MM-DD` left of the avatar; `null` shows nothing.

**Non-Goals:**
- No backfill of historical dates, no edit path for the date, no ordering/filtering by date.
- No lifecycle, auth, priority-order, or column-order changes.

## Decisions

1. **Nullable ISO string with `?? null` fallback.** `startedAt: string | null` in `entities.ts` and `lib/api.ts`; `TaskDoc.startedAt?: string | null`; Mongoose `startedAt: { type: String, default: null }`; `taskDocToDomain` returns `doc.startedAt ?? null`, `taskToDoc` passes through. `createTask` sets `null`. Alternative (required string with empty sentinel) rejected: `null` already models "never started" across `previousState` and matches the request literal `ISO|null`.

2. **Stamp inside `moveTask` on the exact arc with an injectable clock.** After `canTransition` passes, if `task.state === ToDo && target === InProgress && task.startedAt === null`, assign `task.startedAt = now` where `now` defaults to `new Date().toISOString()` via an optional parameter (`moveTask(..., now: string = new Date().toISOString())` or a `() => string` provider, matching repo test style). Because `Blocked` can only return to its previous state, `Blocked -> InProgress` with a set date keeps it, and a hypothetical `null` date reaching `InProgress` via any other arc is impossible except legacy data, which per scope stays `null`. Alternative (stamp in the router before calling `moveTask`) rejected: routers must stay thin parsers like the `priority` change; the rule belongs with `applyStateTransition` so every caller (present and future) inherits it.

3. **`PATCH` silently drops `startedAt`.** Router destructures/ignores `req.body.startedAt`; `editTask` gains no `startedAt` field. Invalid or well-formed values are both ignored with no error. Alternative (`400 validation` like `priority`) rejected per explicit user decision: ignoring keeps old clients safe and reflects that the field is derived, not user input.

4. **Date is a right-aligned `span` left of the avatar, `slice(0, 10)`.** `TaskCard` derives `task.startedAt ?? null`; when set, renders `<span data-testid="task-started-at" title={startedAt} aria-label={...}>` positioned in the bottom strip (`absolute bottom-1 right-9` or flex-adjacent to avatar), `text-[10px] tracking-widest opacity-70`. `slice(0, 10)` yields UTC `YYYY-MM-DD` deterministically; full ISO stays in `title`/aria. `null` renders nothing (no dash, no placeholder) to preserve current card density. Alternative (local-timezone formatting) rejected: shifts the day boundary per viewer and breaks snapshot tests.

## Risks / Trade-offs

- **Legacy `InProgress` tasks stay dateless forever** → Mitigation: accepted per explicit scope (no backfill); the empty state is the honest signal.
- **Clock in domain complicates purity** → Mitigation: optional `now` parameter defaulting to current ISO; tests pass a fixed string, production omits it.
- **Bottom strip crowding (badge + date + avatar)** → Mitigation: date is short (10 chars), attenuated, right-anchored; `null` renders nothing so most historical cards are unchanged.
- **`slice` shows UTC day, not local day** → Mitigation: accepted for determinism; edge-of-midnight tasks may show the adjacent UTC day for some timezones.

## Migration Plan

Additive nullable field with lazy default; deploy API then frontend in any order (old frontend ignores the new JSON field; old backend omits it and new frontend falls back to `null`). Rollback by reverting the files in proposal Impact; persisted `startedAt` values are inert to old code. No data migration.
