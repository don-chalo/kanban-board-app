## Context

`Task` today is `id, boardId, creator, owner, title, description, state, previousState` (`kanban-api/src/domain/entities.ts:18-27`, mirrored in `kanban-front-end/src/lib/api.ts:17-26` and `kanban-api/src/models/index.ts:19-28` + `mappers/task.mapper.ts`). Creation (`tasksRouter.ts:22-38` -> `commands.createTask`) validates only `title`; editing (`tasksRouter.ts:46-62` -> `commands.editTask`) accepts only `title/description` under `Action.EditTask + isEditable`. Frontend `TaskCard.tsx` renders title + `STATE_LABELS` + avatar + move arrow; `TaskModal.tsx` renders TITLE / DESCRIPTION / OWNER with shared create/edit submit; `BoardDetailPage.tsx:445-471` renders `COLUMN_ORDER` columns with `filter(state)` and no sort. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Add `priority: low | medium | high | urgent` end-to-end with `medium` default and `missing -> medium` read fallback.
- Validate in domain and routers with `400 validation` on invalid values.
- Single-letter always-visible badge (`L/M/H/U`) + `PRIORITY` selector in modal + stable per-column priority sort.

**Non-Goals:**
- No lifecycle, auth, or `COLUMN_ORDER` changes; priority does not gate moves.
- No filtering or cross-column sorting by priority.
- No data migration; legacy docs fall back to `medium`.
- No redesign of card layout beyond the badge slot.

## Decisions

1. **String-union `TaskPriority` with `medium` default and `?? medium` fallback.** Type `export type TaskPriority = "low" | "medium" | "high" | "urgent"` in `entities.ts` and `lib/api.ts`; `PRIORITY_WEIGHT = { urgent: 0, high: 1, medium: 2, low: 3 }` only in frontend sort helper. Domain `isTaskPriority(v: unknown)` guard + `normalizePriority(v?) => TaskPriority`. `createTask` takes `priority?` and assigns `normalizePriority(input.priority)`; `editTask` patch gains `priority?` and assigns only when defined after validation. Mappers: `taskDocToDomain` returns `doc.priority ?? "medium"`, `taskToDoc` passes through; Mongoose `taskSchema` adds `priority: { type: String, enum: [...], default: "medium" }`. Alternative (numeric 1-4 enum) rejected: strings are self-describing in API/DB and match `LifecycleState` string style.

2. **Priority edits ride on `Action.EditTask`.** No new action; `editTask` keeps its existing `assertAuthorized(EditTask)` + `isEditable` checks, so owner-or-manager on non-frozen, non-terminal tasks is enforced for free. Routers only parse: `typeof body.priority === "string" ? validate-or-400 : ignore when absent/undefined`. Alternative (separate `POST .../priority` endpoint like owner) rejected: one more route and modal round-trip for a field that already fits the PATCH shape.

3. **Badge is a 1-char `span` bottom-left, always rendered.** `TaskCard` derives `const priority = task.priority ?? "medium"` then `PRIORITY_INITIAL = { low: "L", medium: "M", high: "H", urgent: "U" }`; element `<span data-testid="task-priority-badge" title={priority} aria-label={...}>` positioned `absolute bottom-1 left-1`, `w-5 h-5 text-[10px] border` consistent with avatar/matrix style. Full word only in `title`/aria + existing card tooltip. Alternative (full-word pill next to state) rejected per user: space is reduced and pills wrap on narrow 5-column grid.

4. **Modal `PRIORITY` select below DESCRIPTION, shared for both modes.** `useState(task?.priority ?? "medium")`; `<select aria-label="Task priority">` with 4 options; submit includes `priority` on create always and on edit only when `priority !== (task.priority ?? "medium")`, following the existing owner-delta pattern (`owner !== task.owner`). Alternative (radio group) rejected: 4 radios cost vertical space in a `max-w-sm` dialog; select matches OWNER control.

5. **Stable per-column sort in `BoardDetailPage`, not in backend.** After `filter(task.state === state)`, apply `.slice().sort(byWeightThenIndex)` where weight comes from `PRIORITY_WEIGHT[task.priority ?? "medium"]` and index is the pre-sort position. Backend `board.tasks` order and API payloads stay insertion-ordered. Alternative (backend sort or persisted order field) rejected: display-only concern, avoids changing every `GET board` consumer and keeps rollback frontend-only.

## Risks / Trade-offs

- **Single letter is cryptic on first sight** → Mitigation: `title` + `aria-label` carry full word; legend emerges after one hover. Accepted per explicit request.
- **`M` everywhere adds noise** → Mitigation: `medium` styled most attenuated of the four; always-visible accepted per explicit request.
- **Sort reshuffles existing boards on upgrade** → Mitigation: stable sort keeps equal-priority relative order, so all-`medium` boards render exactly as today; only mixed-priority boards reorder, which is the feature.
- **Legacy docs without `priority`** → Mitigation: read fallback `?? "medium"` in mapper, frontend, and card; Mongoose default covers new writes; no backfill script needed.

## Migration Plan

Additive field with lazy default; deploy API then frontend (either order safe: frontend sends `priority?` optionally, backend ignores-or-accepts; old frontend omits it and gets `medium`). Rollback by reverting the 8 files listed in proposal Impact; persisted `priority` values are inert to old code. No data migration.
