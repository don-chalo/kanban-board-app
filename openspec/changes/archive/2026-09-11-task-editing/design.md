## Context

The backend already supports task editing end-to-end but the client never calls it. `PATCH /boards/:boardId/tasks/:taskId` updates title/description and is authorized by `Action.EditTask` (Task Owner or Board Creator/Owner) with an `isEditable` gate (no frozen board, no terminal task); `POST /boards/:boardId/tasks/:taskId/owner` reassigns the owner and is Creator/Owner only (`routes/tasksRouter.ts`). The create route rejects a blank title with `400`, but the PATCH route does not. On the client there is no task-edit call at all, and `NewTaskModal`'s OWNER list drops the acting user (`id !== actorId`), which for a manager removes the Creator/Owner rows. See `proposal.md` for the motivation.

## Goals / Non-Goals

**Goals:**
- One modal component serving both task creation and task editing, parameterized by mode.
- Editing available to exactly the right people (Task Owner or Board Creator/Owner) and never on frozen boards or terminal tasks.
- Owner selection shows Creator/Owner/Associated members, including the acting user labeled `(me)`.
- Blank task titles rejected both in the UI and by the backend edit `PATCH`.
- Minimal new client surface: one `updateTask` (PATCH) next to the existing API calls.

**Non-Goals:**
- Editing a task's lifecycle state in this modal (state stays with the task card's move arrow).
- Inline per-card editing (the board uses inline editing; tasks deliberately use a modal per user request).
- Task deletion, board-level editing, or board ownership changes — covered elsewhere or out of scope.

## Decisions

1. **Generalize `NewTaskModal` into `TaskModal` with a mode.**
   `TaskModal` gains an optional `task: Task` prop; when present it runs in edit mode. Header and submit label derive from the mode (`> NEW TASK` / `> CREATE` vs `> EDIT TASK` / `> SAVE`), and the fields prefill from the task. The save branches: create → `createTask` then `setTaskOwner` only if an owner was chosen; edit → `updateTask` then `setTaskOwner` only if a manager changed the owner. Runtime and loading states (`submitting`, inline `error`) are shared.
   - **Alternative rejected:** a separate `EditTaskModal` duplicating the form markup and styling — two sources of truth for the same fields.
   - **Alternative rejected:** adding edit props to `NewTaskModal` without renaming — the name would no longer describe the component.

2. **OWNER list includes everyone; the placeholder becomes `(me)`.**
   Remove the `id !== actorId` filter so the owner dropdown lists every resolved member (Creator, Owner, and all Associated). The empty default option — the one managers see when they intend to own the new task themselves — is labeled `(me)` instead of `---`. The existing `owner !== actorId` submission guard still skips a redundant reassign call when the actor picks themselves.
   - **Why:** the members Map already contains creator/owner/associated (`resolveMemberEmails`), so no new lookups; the filter was the only thing hiding self.

3. **Explicit edit gating via a TaskCard `editable` prop.**
   The page computes `editable = (task.owner === actorId || isManager) && !frozen && task.state not in {Done, Cancelled}` and passes it to `TaskCard`, which shows the edit affordance (clicking the card title) only when editable. This is explicit about role and state rather than inferring from `moves.length === 0` (which governs the move arrow and would be the wrong signal for a non-manager member who can move tasks but must not edit).
   - **Alternative rejected:** reusing the arrow's `moves.length === 0` gate — conflates "no transitions" with "not editable" and ignores role.

4. **Save → refetch the board.**
   After a successful edit the modal calls back into `BoardDetailPage`, which runs `loadBoard(false)` — the same refetch that task creation uses — so title, description, and the owner avatar refresh from the server.
   - **Alternative rejected:** applying the returned Task locally with `setBoard`; deferrable but the user chose the consistent refetch path.

5. **Harden the backend PATCH at the router, mirroring create.**
   In `tasksRouter` `PATCH /:taskId`, when `req.body.title` is provided, trim it and reject a blank result with `ApiError('validation', 'title is required')` → `400`, exactly like the `POST /` create handler. If only a description is sent, the title is left untouched. The domain command `editTask` stays a raw setter to match the create route's convention of validating at the boundary.
   - **Alternative rejected:** enforcing the invariant inside the `editTask` domain command — less consistent with where create validates, and would change domain semantics this change does not need.

## Risks / Trade-offs

- **Modal rename churns tests and imports.** `NewTaskModal.tsx`/`.test.tsx` become `TaskModal.*`; create behavior stays covered by the create-mode tests in the renamed suite. → Rename and update all imports and BoardDetailPage stubs in the same step.
- **Refetch after edit causes a board reload.** Already the established create-path behavior, so it is consistent; no flicker beyond a brief state update.
- **Backend PATCH break stands.** Any client sending a blank title now gets `400`; today no client uses the endpoint, so it is safe and enforces the "never blank" rule symmetrically with create.
- **OWNER select with self listed.** Picking self in create is a no-op thanks to the `owner !== actorId` guard; the `(me)` label keeps the intent clear.

## Migration Plan

1. Backend first: add the PATCH blank-title `400` and its route tests (deployable independently, no client depends on the new behavior).
2. Then the frontend: add `updateTask` to `api.ts`, rename/extend the modal, wire the edit trigger and save handler in `BoardDetailPage`, update tests.
3. No data migration; existing tasks are unaffected by validation changes.

## Open Questions

- Should the edit action trigger be the whole card or only the title area? Purely cosmetic; answerable at implementation time without changing the specs or approach.