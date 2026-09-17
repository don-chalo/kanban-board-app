## Context

The backend already exposes `DELETE /boards/:boardId/members/:userId` with manager-only authorization via `manageBoard(board, actor, { kind: "removeMember", member })`. The frontend MEMBERS panel (in `BoardDetailPage.tsx`) renders `[creator, owner, ...associated]` as a flat list, with an add-member flow that commits immediately and applies results via `setBoard` (no refetch). This change adds the removal counterpart. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Remove an associated member from the MEMBERS panel with a hover-reveal "X", gated to managers on unfrozen boards
- Ask for confirmation when the removed member owns tasks, via a dialog with Yes/Cancel
- Enforce the frozen-board rejection on the backend too (currently only `deleteTask` has this guard)

**Non-Goals:**
- Removing the Creator or Owner (never in `board.associated`; the domain already rejects it)
- Removing yourself (the creator/owner hold the manager rows; the "X" only appears on associated rows)
- Refetching the board after removal — the local `setBoard` pattern from add-member is reused
- Any task cleanup or reassignment when a removed member owned tasks (display stays consistent because owner IDs still resolve via `resolveMemberEmails`)

## Decisions

1. **Hover-reveal "X" uses Tailwind's `group` pattern, not JS state.** Each `<li>` in the MEMBERS list becomes `group`; the "X" button is `invisible group-hover:visible`. No per-row hover state to track. The button is only rendered when `isManager && !frozen`.

2. **Removal commits immediately for members without tasks, mirroring the add-member flow.** Clicking "X" for a member who owns no tasks calls the new `removeMember(boardId, userId)` client (a `DELETE` mirroring `addBoardMember`'s shape), then applies the returned board via `setBoard`. On failure, the removal error is shown in the `memberError` spot and no row is removed.

3. **Task-owning members get a confirmation dialog, modeled on `NewTaskModal`.** Clicking "X" first checks `board.tasks.some((t) => t.owner === userId)`. If the member owns tasks, an overlay dialog is shown naming the member (e.g., "alice@example.com has task(s) assigned, confirm delete") with YES and CANCEL buttons. Yes runs the removal; Cancel closes the dialog and sends no request. Members with no tasks skip the dialog entirely. Removal *failures* (Yes chosen, request failed) still surface in the `memberError` slot.

4. **Backend frozen gate in `manageBoard`.** The `removeMember` case gets the same `isBoardFrozen` guard `deleteTask` uses, throwing `DomainError("read_only", ...)`, which surfaces as a 409 via the existing error mapping. The `boardsRouter` route needs no change.

5. **"X" placement scoped to associated members.** The button renders only when the rendered id is present in `board.associated` and is not the actor's own id (defensive; creator/owner can never equal an associated id, but the guard is cheap and future-proof).

## Risks / Trade-offs

- [Removed member still owns tasks] → Accept for now; owner IDs continue to resolve on reload, and this is a known product trade-off (adding task reassignment is out of scope)
- [Dialog needs an opened-state and target member in the page] → A small `removeTarget` state (the `UserId` pending confirmation, or `null`) drives the dialog; Esc/defocus on the overlay closes it without removal
- [Inconsistency: `addMember` and `editAttributes` still lack a frozen gate] → Only `removeMember` is gated in this change; closing the other two is out of scope and can be a follow-up change
- [Hover-only affordance hides the action on touch devices] → Consistent with the existing hover-reveal arrow on task cards; acceptable for this terminal

## Migration Plan

Frontend and backend deploy together. No data migration; the backend change only rejects requests that previously succeeded on frozen boards.

## Open Questions

(none)