## Context

See proposal.md for motivation. `TaskCard.tsx` already imports Radix `Tooltip` and uses it for the priority badge and owner avatar; the story-points badge and started-at date still use the native `title` attribute, and the card renders a state label duplicating its column. `task.comments` already travels in the task payload.

## Goals / Non-Goals

**Goals:**
- One tooltip system on the card, no duplicated state, no native hover titles.

**Non-Goals:**
- Behavior changes beyond the three swaps (gate rule goes in the follow-up change).

## Decisions

### D1: Copy the priority-badge tooltip for story points
Same `Tooltip.Root` + `Trigger asChild` + `Portal` + `Content` structure with text `Story points: <n>`; the `title` attribute is deleted, `aria-label` untouched. Alternative (shared tooltip wrapper component) rejected: three usages don't justify the abstraction yet.

### D2: State line becomes conditional plain text
`{task.comments.length > 0 && (...COMMENTS (N)...)}` in place of the state `<p>`, same text styling. Plain text, not a button — opening the modal from the count is explicitly out of scope. `aria-label` on the count is unnecessary; the visible text is the accessible name. The line always renders (invisible `aria-hidden` non-breaking space when empty) so card height never varies.

### D3: Delete the date's `title`, keep `aria-label`
One-line removal; accessible name and tests keep working through `aria-label`.

## Risks / Trade-offs

- [`BoardDetailPage.test.tsx` may assert the state line] → Mitigation: update those assertions to the count rule as part of implementation.

## Migration Plan

Single-release frontend change. Rollback is revert.

## Open Questions

None.
