## Why

The board detail page is currently a blank route (`/boards/:boardId`) while the API already exposes everything it needs: the full board aggregate with tasks, board/task move actions, task creation, and member lookups. Boards exist but can't be seen or operated on. This change turns the route into a real board detail page and makes the boards lifecycle the initial version is waiting for.

## What Changes

- **Replace the blank board detail route** with a working page: board title (large), description line, a right-side identity panel (creator, owner, board state, members), and a body of five state columns (To Do, In Progress, Done, Blocked, Cancelled) grouping the board's tasks.
- **Board state select** in the identity panel: shows the current state and offers only the legal target states returned by `GET /boards/:boardId/actions`; disabled while still showing the state on terminal boards (Done/Cancelled).
- **Task cards**: title (truncated), state, and an owner avatar showing the email's first letter with a tooltip revealing the full email. Right-side arrow appears on hover and opens a dropdown of the task's legal moves (`GET /boards/:boardId/tasks/:taskId/actions`); choosing one moves the task and refreshes the board. Arrow disabled when no moves are legal.
- **Task creation**: a "+" action opens a modal dialog with a required title and optional description and owner. The owner field is shown only to the board creator/owner (a non-manager's new tasks are owned by themselves). New tasks land in the To Do column.
- **Frozen/terminal rendering**: when the board is Blocked, Cancelled, or Done the page renders read-only — creation and move controls disabled — and terminal boards also lock the state select, mirroring the API's cascade rules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend/boards`: REMOVES the "Blank board detail route" requirement (superseded) and ADDS the board-detail requirements (display, state control, columns, task creation, task movement, read-only rendering).

## Impact

- `kanban-front-end`: adds `@radix-ui/react-select`, `@radix-ui/react-avatar`, and `@radix-ui/react-tooltip` dependencies.
- `kanban-front-end/src/lib/api.ts`: adds `getBoard`, `boardActions`, `taskActions`, `createTask`, `moveBoard`, `moveTask`, `setTaskOwner`, `getUser` plus a typed `Task`; board/task move actions are driven by the existing actions endpoints.
- `kanban-front-end/src/pages/BoardDetailPage.tsx`: replaced wholesale (page shell, head, identity panel, state columns, task cards + move dropdown, creation modal).
- `kanban-front-end/src/App.tsx`, `src/lib/session.ts`: unchanged (route and guard already exist).
- No API changes; all endpoints already exist.