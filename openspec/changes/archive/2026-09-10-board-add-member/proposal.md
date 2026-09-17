## Why

The board detail page shows members but has no way to add them: sharing a board currently requires the API. Adding an autocompleted, find-or-create member picker lets a Creator/Owner invite collaborators from the UI in a few keystrokes.

## What Changes

- Show a "+" action on the MEMBERS panel row, visible only to the board Creator/Owner (matching the existing `isManager` gate used for the task owner field).
- Clicking "+" reveals an inline email entry with autocomplete suggestions from `GET /users?email=<prefix>`; typing a fresh email resolves it via `POST /users/resolve` (find-or-create), then adds the member via `POST /boards/:boardId/members`.
- On success the board refetches so the new member appears in the MEMBERS list, the task owner dropdown, and card avatars immediately.
- Inline error states (duplicate member, creator/owner email, unknown email, request failure) and an in-flight guard (no duplicate submits); Escape or blur cancels the entry.
- Depends on the `user-search-and-resolve` backend change being deployed.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `frontend/boards`: add a member-management requirement covering the manager-only "+" action, picker/add flow, and refresh behavior.

## Impact

- `kanban-front-end`: `api.ts` gains a member-search/resolve/add client; `BoardDetailPage` gains the member-entry picker on the MEMBERS panel; member map refresh keeps avatars and the owner selector consistent; DOM tests added.
- Depends on `user-search-and-resolve`; no backend changes in this change.