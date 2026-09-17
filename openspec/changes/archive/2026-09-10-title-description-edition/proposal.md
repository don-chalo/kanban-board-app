## Why

The board title and description can be changed only through the API, so a manager has to leave the app to correct or add any board metadata. Inline editing lets the Creator/Owner click the title or description, edit it in place, and confirm with Enter, keeping the flow in the page.

## What Changes

- The board title (`h1`) and description paragraph on the board detail page become click-to-edit fields for the Board Creator/Owner: clicking enters an inline input pre-filled with the current value (autofocused, text selected); pressing Enter saves; pressing Escape or blurring cancels.
- Saving submits `PATCH /boards/:boardId` with the changed field and applies the returned board locally — no full-board refetch.
- Editing SHALL NOT be offered to non-managers (they see the plain text only) and SHALL be disabled on frozen boards (`Blocked`, `Cancelled`, `Done`), matching the existing read-only rendering.
- A blank description is saveable (it clears and the "(no description)" placeholder returns); a blank title is rejected inline with no request, mirroring creation-time validation.
- No backend changes; `PATCH /boards/:boardId` already exists and is manager-gated.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `frontend/boards`: add a board-detail editing requirement covering the manager-only click-to-edit title/description flow, Enter/blur cancel semantics, locally-applied save, frozen-board locking, and blank-title rejection.

## Impact

- `kanban-front-end`: `api.ts` gains a `PATCH /boards/:boardId` client; `BoardDetailPage` learns an inline-edit-control pattern reusing the existing `isManager` and `frozen` gates; DOM tests added.
- Backend: none (endpoint and authorization already exist).
- Note (frontend-only assumption): `PATCH` does not validate blank titles server-side; the blank-title guard is enforced in the UI for now, keeping this change frontend-only.