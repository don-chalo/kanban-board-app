## Why

The task card shows information it doesn't need (its state duplicates the column it's in) while using a native tooltip for story points next to a Radix one for priority, and it leaks the raw ISO date through a native hover title. Three small coherence fixes in one front-only pass.

## What Changes

- Story-points badge tooltip migrates from the native `title` attribute to the Radix `Tooltip` already used on the card (priority badge pattern), keeping the same text and accessible name.
- The state label line is replaced by a plain-text `COMMENTS (N)` count shown only when the task has comments; with zero comments nothing renders there.
- The native `title` attribute is removed from the started-at date (accessible name unchanged).

## Capabilities

### New Capabilities

None. All behavior refines an existing capability.

### Modified Capabilities

- `frontend/boards`: task card content (tooltip, state line, date title).

## Impact

- Frontend only: `kanban-front-end/src/pages/TaskCard.tsx` plus `TaskCard.test.tsx` (and any `BoardDetailPage.test.tsx` assertions on the card's state line).
- No backend, API, or other spec changes.
