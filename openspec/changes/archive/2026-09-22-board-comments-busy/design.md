## Context

See proposal.md for motivation. The board comments section in `BoardDetailPage.tsx` (entry input on top, newest-first list, `InlineEdit` edits, `YES`/`CANCEL` remove dialog, `loadBoard(false)` refresh) has no busy feedback today; the sibling implementation in `TaskModal.tsx` already defines the pattern to mirror. No backend changes.

## Goals / Non-Goals

**Goals:**
- Visible busy state on board comment create, edit, and remove with no duplicate requests and restore-on-failure.

**Non-Goals:**
- Backend or API changes, task comment changes, skeleton loaders.

## Decisions

### D1: Mirror the TaskModal busy pattern verbatim
`addingBoardComment` boolean guards the entry (disabled input + inline spinner, re-entrant Enter/click ignored); `busyBoardCommentId` renders a spinner on that row with its actions disabled (shared `InlineEdit` untouched); the remove dialog's YES disables with a spinner while its delete is in flight. Failure restores the prior state plus the existing error message. Alternative (skeleton rows) rejected: skeletons suit list loads, not single mutations — same call as in task-comments.

## Risks / Trade-offs

- [Dialog open on remove failure] → Accepted: dialog stays open with the error behind it, same as the task modal; the comment is provably kept.

## Migration Plan

Single-release frontend change. Rollback is revert.

## Open Questions

None.
