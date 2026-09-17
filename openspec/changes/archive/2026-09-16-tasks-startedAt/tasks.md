## 1. Backend domain and persistence

- [x] 1.1 Add `startedAt: string | null` to `Task` with `null` default in `kanban-api/src/domain/entities.ts`; set `null` in `createTask` and stamp exactly once in `moveTask` on `ToDo -> InProgress` when `null` (injectable clock defaulting to current ISO, never overwrite) in `kanban-api/src/domain/commands.ts`; verify `domain/commands.test.ts` covers first-stamp, blocked-return-unchanged, non-start-transition-stays-null, and legacy editability gates unchanged
- [x] 1.2 Add `startedAt` (`String`, `default: null`) to `taskSchema`/`TaskDoc` in `kanban-api/src/models/index.ts` and roundtrip it in `kanban-api/src/mappers/task.mapper.ts` with `doc.startedAt ?? null` read fallback; verify `models.test.ts` and `mappers/mappers.test.ts` cover default write, explicit write, and legacy-doc read as `null`
- [x] 1.3 Return `startedAt` from task reads and state-move responses and silently drop `startedAt` in `PATCH /:taskId` in `kanban-api/src/routes/tasksRouter.ts` (no error, stored value unchanged); verify `routes/tasksRouter.test.ts` covers create-null, first-move-stamps, second-cycle-unchanged, and patch-ignores-startedAt

## 2. Frontend date badge

- [x] 2.1 Add `startedAt: string | null` to `Task` in `kanban-front-end/src/lib/api.ts` (read fallback `?? null` where tasks are consumed); verify existing `lib` tests still pass
- [x] 2.2 Render `YYYY-MM-DD` (`startedAt.slice(0, 10)`, `data-testid="task-started-at"`, `title` + `aria-label` with full ISO) left of the owner avatar in `kanban-front-end/src/pages/TaskCard.tsx`, rendering nothing when `null`/missing, without moving title/state/badge/avatar/arrow; verify `TaskCard.test.tsx` asserts date shown, full-ISO tooltip/a11y name, and null-renders-nothing

## 3. Suite

- [x] 3.1 Run `npm test` in `kanban-api` and `npx vitest run` in `kanban-front-end` until green, then `npm run lint` and `npm run build` in both packages with no new warnings
