## Context

`Task` today is `id, boardId, creator, owner, title, description, state, previousState, priority, startedAt` (`kanban-api/src/domain/entities.ts`, mirrored in `kanban-front-end/src/lib/api.ts` and `kanban-api/src/models/index.ts` + `mappers/task.mapper.ts`). `priority` set the validation pattern: domain guard (`isTaskPriority`) + `DomainError("validation")` in `createTask`/`editTask` + `ApiError("validation")` `400` in `tasksRouter.ts` `POST /` and `PATCH /:taskId` under `Action.EditTask`. `TaskCard.tsx` renders title + state + priority badge bottom-left + `startedAt` bottom-right + avatar bottom-right + move arrow middle-right. `TaskModal.tsx` stacks TITLE / DESCRIPTION / PRIORITY / OWNER. `BoardDetailPage.tsx:416-444` renders description then `+ NEW TASK`, and column headers show `LABEL (n)` counts. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Add `storyPoints: 1 | 2 | 3 | 5 | 8 | 13 | null` end-to-end with `null` default and `missing -> null` read fallback; `null` counts as `0` in sums.
- Validate the Fibonacci set in domain and routers with `400 validation` on invalid values.
- Corner badge, side-by-side modal selectors, board aggregate line.

**Non-Goals:**
- No ordering/filtering by points, no burndown or velocity views.
- No lifecycle, auth, priority-order, startedAt, or column-order changes.

## Decisions

1. **Numeric union with `null` absent state, mirroring `priority`.** `export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13` in `entities.ts` and `lib/api.ts`; field `storyPoints: StoryPoints | null`. Domain `isStoryPoints(v: unknown)` guard (explicit set membership, no range check so `0`/`4`/`7` fail); `createTask` takes `storyPoints?` defaulting to `null` and rejecting defined-but-invalid; `editTask` patch gains `storyPoints?` accepting a Fibonacci value or `null` to clear, rejecting anything else. Mongoose `storyPoints: { type: Number, enum: [1, 2, 3, 5, 8, 13], default: null }`; `TaskDoc.storyPoints?: number | null`; mappers `doc.storyPoints ?? null`. Alternative (string union like `"5"`) rejected: arithmetic for the aggregate needs numbers, and JSON round-trips numbers cleanly.

2. **Points edits ride on `Action.EditTask`.** Same as `priority`: no new action, existing authorize + `isEditable` gates. Routers only parse: defined-and-not-null values must pass `isStoryPoints` or `400`; explicit `null` on `PATCH` clears; absent means untouched. Alternative (separate estimate endpoint) rejected per the established `PATCH` shape.

3. **Badge is a corner `span` top-right, hidden when `null`.** `TaskCard` derives `task.storyPoints ?? null`; when set, `<span data-testid="task-story-points" title={String(v)} aria-label={...}>` at `absolute top-1 right-1`, xenon-bordered like the priority badge. The title element gains right padding so truncated text never runs under it. The move arrow lives at `top-1/2`, so no collision. `null` renders nothing (same convention as the date). Alternative (bottom-center) rejected per explicit user choice; it would crowd badge + date + avatar.

4. **Modal row is a two-column grid below DESCRIPTION.** `<div className="grid grid-cols-2 gap-3">` wrapping the existing PRIORITY label plus a new STORY PTS `<select aria-label="Story points">` with options `--` (value `""` mapping to `null`), `1, 2, 3, 5, 8, 13`. State `useState<number | null>(task?.storyPoints ?? null)`; submit includes `storyPoints` on create (as `null` when `--`) and on edit only when changed, following the priority-delta pattern. `--` always available so estimates can be cleared. Alternative (stacked full-width selects) rejected per explicit user choice.

5. **Aggregate is a derived line under the description, no API change.** `BoardDetailPage` computes `total = sum(storyPoints ?? 0)`, `inProgress = tasks.filter(state === "InProgress")`, `inProgressPoints = sum(...)`, rendering `<p data-testid="board-effort-summary">TOTAL: {total} PTS - IN PROGRESS: {n} TASKS ({y} PTS)</p>` between the description `InlineEdit` and the `+ NEW TASK` row. Recomputes on every `board` render, so it stays in sync exactly like column counts. Literal format always (no singular/plural branching). Alternative (backend-computed summary endpoint) rejected: trivial derivation, avoids a new contract and keeps rollback frontend-only.

## Risks / Trade-offs

- **`null` vs `0` confusion in sums** → Mitigation: single rule `?? 0` in exactly one helper used by both sums; explicit tests with `null` mixes.
- **Corner badge vs long titles** → Mitigation: title padding + `truncate` already handles overflow with ellipsis; explicit test with a long title.
- **Two-column modal on narrow screens** → Mitigation: `max-w-sm` still fits two compact selects; fallback to stacked layout only if visual check fails.
- **Legacy docs without the field** → Mitigation: read fallback `?? null` in mapper and frontend; Mongoose default covers new writes; no backfill.

## Migration Plan

Additive nullable field with lazy default; deploy API then frontend in any order (old frontend ignores the new JSON field; old backend omits it and new frontend falls back to `null`). Rollback by reverting the files in proposal Impact; persisted `storyPoints` values are inert to old code. No data migration.
