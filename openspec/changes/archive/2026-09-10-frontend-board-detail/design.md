## Context

`GET /boards/:boardId` returns the full board aggregate including its tasks (`boardRepo.ts` loads tasks into the domain Board). The existing `GET /boards/:boardId/actions` and `GET /boards/:boardId/tasks/:taskId/actions` already return the legal target states for the board and for each task (arrays of lifecycle-state strings; empty once terminal/frozen). `POST /boards/:boardId/tasks` creates a task in `ToDo` with `creator === owner === actor` and validates a non-blank title. `POST /boards/:boardId/state` and `POST /boards/:boardId/tasks/:taskId/state` move the entities; `POST /tasks/:taskId/owner` reassigns a task owner but requires the actor to be the board creator or owner (`authorize.ts:32`) and the target to be a member. `GET /users/:userId` resolves emails. The front-end route `/boards/:boardId` and its auth guard already exist (`App.tsx`).

## Goals / Non-Goals

**Goals:**
- Display the board (head: title + description), an identity panel (creator, owner, state select, members), and five state columns with task cards.
- Task cards show title/state/owner-avatar (+email tooltip), with a hover arrow opening a legal-moves dropdown.
- Create a task through a modal (title required; description and owner optional).
- Reflect the boards-spec cascade in the UI: frozen/terminal boards disable creation and moves, terminal boards lock the state select.

**Non-Goals:**
- Board title/description editing, member add/remove, board owner reassignment from the page.
- Drag-and-drop or column-level task creation.
- A backend bulk-member endpoint (N small member lookups are acceptable).
- Image avatars: avatars are always the fallback letter (no picture sources exist).

## Decisions

- **Extend `src/lib/api.ts`** with: a `Task` interface; retyping `Board.tasks` as `Task[]`; `getBoard(boardId)` returning a `{ ok | unauthorized | error }` result (same 401 contract as `listBoards`); `getUser(userId)` returning the user or `null` on 404; `boardActions(boardId)` and `taskActions(boardId, taskId)` returning string arrays; `createTask(boardId, { title, description })`, `moveBoard(boardId, target)`, `moveTask(boardId, taskId, target)`, `setTaskOwner(boardId, taskId, owner)` throwing on non-ok. All requests attach `authHeaders()`.
- **Member email map**: on load, resolve the emails for the board's `creator` + `owner` + `associated` in parallel with `Promise.all`, building `memberEmails: Map<userId, email>`. Cards resolve their `task.owner` from this map (task owners are always members, `commands.ts:104`); unknown ids fall back to the raw id.
- **One shared state-control pattern (pinned current + legal moves)** for both the board select and the per-task move dropdown: the current state renders as a disabled item so Radix can display it, and the selectable items are exactly the legal targets (from the `.../actions` endpoints). Empty actions list -> the control is disabled (arrow hidden/disabled, select locked) while still showing the current value. Terminal detection comes from the actions list being empty for the board; frozen board / terminal task likewise disable task arrows via `taskActions`.
- **Page state machine mirrors `BoardsPage`**: `loading` / `error` / 401 (clear session, redirect to `/login`). After every state change to the board or a task, refetch `getBoard(boardId)` rather than mutating local lists (single source of truth; cards move columns automatically).
- **Radix deps**: `@radix-ui/react-select` (board select + task move dropdown), `@radix-ui/react-avatar` (circle with `Avatar.Fallback` letter = first char of email uppercased; no `src`), `@radix-ui/react-tooltip` (wraps the avatar, `delayDuration={0}` under test via config flag, full email in tooltip). Portal-based dropdowns render outside the test container: tests query `document.body` and stub `element.scrollIntoView`/timers.
- **Creation modal: hand-rolled overlay** (fixed inset backdrop + centered panel, matching the matrix theme) — deliberately avoids `@radix-ui/react-dialog` to keep deps lean and portal-tests simpler. Fields: title (required), description (optional), owner (optional, only rendered when the actor `=== board.creator || board.owner`). Submit: `createTask` then, if an owner was chosen and differs from the actor, `setTaskOwner` (granted because a manager performed the call). Blank or whitespace-only titles are rejected with an inline error and no request.
- **Freeze/terminal UI data**: derived from the loaded board state only (no extra endpoint). `isFrozen = state in {Blocked, Cancelled, Done}` disables the new-task button and all task arrows; terminal = `{Done, Cancelled}` additionally locks the board select (select disabled but retaining its displayed current value).
- **Hover arrow**: Tailwind `group`/`group-hover` on the card reveals the arrow; `truncate` clips long titles and any email shown as text.

## Risks / Trade-offs

- [Radix portals + animations in happy-dom] -> Tests drive dropdowns through `document.body`; stub `Element.prototype.scrollIntoView`; use a fixed `delayDuration` for tooltips; flush with `await act(async () => {})`.
- [N small member lookups] -> Parallel `Promise.all`; typically 3-5 requests; acceptable now, a bulk endpoint is a possible later backend change.
- [Two-step owner assignment needs manager rights] -> The owner field is hidden for non-managers, avoiding a runtime `403`.
- [Missing `/users/:userId` record] -> Fall back to the raw user id in the member map and card.
- [Board Done gate] -> No client-side recomputation: the select options come from `boardActions`, which already applies the gate server-side (`guards.ts:31`).

## Migration Plan

- Front-end only: add the three Radix dependencies, extend `api.ts`, rebuild `BoardDetailPage` with member-map resolution, verify `npm test`, `npm run lint`, `npm run build`. No data migration; rollback is reverting the app files and dependency removal.

## Open Questions

None — card layout (title/state/truncate, bottom-right avatar, hover arrow), terminal-select behavior, and modal owner gating are all settled in the delta spec.