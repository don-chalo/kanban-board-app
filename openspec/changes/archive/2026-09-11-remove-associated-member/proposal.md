## Why

The board detail page lets a manager add associated members but provides no way to remove them. Once a member is added, the only option is to use the raw API. This change adds a hover-to-reveal "X" action on associated member rows so managers can remove members directly from the UI.

## What Changes

- Add a hover-reveal "X" button on each associated member row in the MEMBERS panel
- The "X" is visible only to the Board Creator/Owner and only on unfrozen boards
- Clicking "X" removes the member via the existing `DELETE /boards/:boardId/members/:userId` endpoint; when the member owns tasks, a confirmation dialog is shown first and removal proceeds only when confirmed
- On frozen boards (`Blocked`, `Cancelled`, `Done`), member removal is rejected on both frontend and backend (matching the `deleteTask` pattern)

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `frontend/boards`: ADD requirement "Member removal" — the UI action for managers to remove associated members, with hover reveal, frozen-board gating, and task-owner confirmation
- `http-api`: MODIFY requirement "Board lifecycle and membership endpoints" — add frozen-board rejection to `DELETE /boards/:boardId/members/:userId` (currently only gated on manager role)

## Impact

- **Frontend**: `api.ts` (new `removeMember` client), `BoardDetailPage.tsx` (hover "X", removal handler, confirmation dialog), DOM tests
- **Backend**: `commands.ts` (`manageBoard` removeMember case — add `isBoardFrozen` guard), domain tests
- **No new dependencies or schema changes**
