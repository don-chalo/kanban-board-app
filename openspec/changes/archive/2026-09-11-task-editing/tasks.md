## 1. Backend blank-title invariant

- [x] 1.1 Harden `PATCH /boards/:boardId/tasks/:taskId` in `src/routes/tasksRouter.ts`: when `title` is provided, trim it and reject a blank result with `ApiError('validation', 'title is required')` (mirrors the create `POST`); verify `tasksRouter.test.ts` covers a blank-title PATCH returning `400` with the task unchanged and an existing valid edit still passing
- [x] 1.2 Run `npx vitest run` (with stale `dist/` cleaned first) and `npm run build` in `kanban-api`; verify all pass and `tsc` is clean

## 2. Data layer

- [x] 2.1 Add `updateTask(boardId, taskId, { title?, description? })` to `src/lib/api.ts` calling `PATCH /boards/:boardId/tasks/:taskId` in `updateBoard`/throwing style, returning `Task`; verify `api.test.ts` covers success (URL/method/headers, returned task), non-ok rejection, and that optional fields are omitted from the body when absent

## 3. TaskModal (rename, owner-list fix, edit mode)

- [x] 3.1 Rename `src/pages/NewTaskModal.{tsx,test.tsx}` to `TaskModal.{tsx,test.tsx}` and update imports in `BoardDetailPage.tsx` and `TaskModal.test.tsx`; verify the renamed create-mode tests still pass unchanged (create behavior preserved)
- [x] 3.2 Fix the OWNER list: drop the `id !== actorId` filter so the dropdown lists the Creator, Owner, and all Associated members, and label the empty default option `(me)` instead of `---`; verify `TaskModal.test.tsx` shows the creator/owner rows and the `(me)` option for a manager
- [x] 3.3 Add edit mode via an optional `task` prop: prefill title/description/current owner, render `> EDIT TASK` / `> SAVE`, keep the OWNER field hidden for non-managers, and reject a blank title with an inline error and no request; verify `TaskModal.test.tsx` covers prefill, labels, non-manager hiding, and blank-title rejection in edit mode
- [x] 3.4 Wire edit submit: call `updateTask` (title/description) and `setTaskOwner` only when a manager changed the owner, then invoke `onSave`/`onCreated`; verify `TaskModal.test.tsx` with stubbed `PATCH` + owner `POST` asserts the requests and no redundant owner call when the owner is unchanged

## 4. Edit trigger and integration

- [x] 4.1 Add an `editable` prop to `src/components/TaskCard.tsx` and render an edit affordance on the card (clicking the title) only when editable; verify `TaskCard.test.tsx` DOM tests show the affordance for an editable task and none for a non-editable one
- [x] 4.2 In `src/pages/BoardDetailPage.tsx` compute `editable` per task as `(task.owner === actorId || isManager) && !frozen && !terminal(task)` and open the `TaskModal` in edit mode for that task; after a successful edit run `loadBoard(false)` and refetch; verify `BoardDetailPage.test.tsx` covers: manager and task owner see/use the trigger, non-owner non-managers and frozen/terminal boards show none, and a saved edit refetches so title/description and the owner avatar update
- [x] 4.3 Run `npx vitest run`, `npm run lint`, and `npm run build` in `kanban-front-end`; verify all pass