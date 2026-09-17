## 1. Backend domain and persistence

- [x] 1.1 Add `TaskPriority` (`low | medium | high | urgent`), `priority` field, `isTaskPriority` guard, and `normalizePriority` (missing -> `medium`) in `kanban-api/src/domain/entities.ts`; extend `createTask` input with `priority?` (default `medium`) and `editTask` patch with `priority?` (validate, assign when defined) in `kanban-api/src/domain/commands.ts` keeping `Action.EditTask` + `isEditable` gates; verify `domain/commands.test.ts` and `domain/entities.test.ts` cover default, explicit, invalid-reject, legacy-missing, and frozen/terminal rejection
- [x] 1.2 Add `priority` (`enum`, `default: "medium"`) to `taskSchema`/`TaskDoc` in `kanban-api/src/models/index.ts` and roundtrip it in `kanban-api/src/mappers/task.mapper.ts` with `doc.priority ?? "medium"` read fallback; verify `models.test.ts` and `mappers/mappers.test.ts` cover default write, explicit write, and legacy-doc read
- [x] 1.3 Accept optional `priority` in `kanban-api/src/routes/tasksRouter.ts` `POST /` and `PATCH /:taskId` (validate string union, `400 validation` on invalid, omit-when-absent passthrough) and return persisted priority in responses; verify `routes/tasksRouter.test.ts` covers create-default, create-explicit, create-invalid-400, edit-change, edit-invalid-400-unchanged, and read-legacy-as-medium

## 2. Frontend data and badge

- [x] 2.1 Add `TaskPriority` type, `priority` field, `PRIORITY_WEIGHT`, and `priority?` passthrough in `createTask`/`updateTask` in `kanban-front-end/src/lib/api.ts` (read fallback `?? "medium"` where tasks are consumed); verify existing `lib` tests still pass
- [x] 2.2 Render an always-visible single-letter badge (`L/M/H/U`, `data-testid="task-priority-badge"`, `title` + `aria-label` with full word, `?? "medium"` fallback) bottom-left in `kanban-front-end/src/pages/TaskCard.tsx` without moving title/state/avatar/arrow; verify `TaskCard.test.tsx` asserts `U/H/M/L` initials, full-word tooltip/a11y name, and missing-renders-`M`
- [x] 2.3 Add a `PRIORITY` `<select aria-label="Task priority">` below DESCRIPTION in `kanban-front-end/src/pages/TaskModal.tsx` defaulting to `medium` on create, prefilling `task.priority ?? "medium"` on edit, and sending `priority` on create plus only-on-change on edit (same delta pattern as owner); verify `TaskModal.test.tsx` covers create-default, edit-prefill, edit-change-sends, edit-unchanged-omits, and blank-title still blocks with no request

## 3. Column ordering and suite

- [x] 3.1 Stable-sort `board.tasks.filter((t) => t.state === state)` by `PRIORITY_WEIGHT[priority ?? "medium"]` with original-index tiebreak in `kanban-front-end/src/pages/BoardDetailPage.tsx`, keeping `COLUMN_ORDER`, `section aria-label`, and header counts untouched; verify `BoardDetailPage.test.tsx` asserts `urgent > high > medium > low` top-to-bottom in one column, stable order for ties, and other columns unaffected
- [x] 3.2 Run `npm test` in `kanban-api` and `npx vitest run` in `kanban-front-end` until green, then `npm run lint` and `npm run build` in both packages with no new warnings
