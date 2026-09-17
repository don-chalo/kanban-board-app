## MODIFIED Requirements

### Requirement: Task card
A task card SHALL show the task's title (truncated when long) and its lifecycle state, an owner avatar showing the first letter of the owner's email with a tooltip revealing the full email, a right-side arrow that appears when the pointer hovers the card, and an always-visible priority badge showing only the initial letter (`L` for `low`, `M` for `medium`, `H` for `high`, `U` for `urgent`). The badge SHALL expose the full priority word via its accessible name and tooltip. A task without a priority SHALL render as `M`. The card SHALL show the start date as `YYYY-MM-DD` (the first 10 characters of `startedAt`) to the left of the owner avatar when `startedAt` is set; when `startedAt` is `null` or missing it SHALL show no date. The date SHALL expose the full ISO value via its accessible name and tooltip. The card SHALL show a story-points badge in the top-right corner with the estimate value when `storyPoints` is set; when `storyPoints` is `null` or missing it SHALL show no badge. The badge SHALL expose its value via its accessible name and tooltip. The title SHALL leave room so it does not run under the corner badge.

#### Scenario: Card shows title, state, and owner avatar
- **WHEN** a task card renders
- **THEN** the title, the state, and the owner's avatar are visible, and hovering the avatar shows the owner's email

#### Scenario: Long titles are truncated
- **WHEN** a task title exceeds the column width
- **THEN** the title is clipped with an ellipsis instead of wrapping

#### Scenario: Priority badge shows only the initial
- **WHEN** a task with priority `urgent` renders
- **THEN** the card shows a `U` badge that reveals `urgent` via tooltip and accessible name

#### Scenario: Missing priority renders as medium
- **WHEN** a task without a priority renders
- **THEN** the card shows an `M` badge

#### Scenario: Start date shows left of the avatar
- **WHEN** a task with `startedAt` `2026-09-16T10:00:00.000Z` renders
- **THEN** the card shows `2026-09-16` to the left of the avatar with the full ISO in its tooltip and accessible name

#### Scenario: Missing start date shows nothing
- **WHEN** a task with `startedAt null` renders
- **THEN** the card shows no date

#### Scenario: Estimate badge shows in the corner
- **WHEN** a task with `5` story points renders
- **THEN** the card shows a `5` badge in the top-right corner with its value in the tooltip and accessible name

#### Scenario: Missing estimate shows no badge
- **WHEN** a task with `storyPoints null` renders
- **THEN** the card shows no points badge

### Requirement: Task columns
The web app SHALL render one column per lifecycle state (To Do, In Progress, Done, Blocked, Cancelled) and SHALL place each task card in the column matching that task's current state. Each column header SHALL display the state label followed by the task count in the form `LABEL (n)`, where `n` is the number of tasks currently in that state; the `(n)` suffix SHALL always be visible, including `(0)` for empty columns, and SHALL be rendered in an attenuated style. The column accessible name SHALL remain the bare state label (unchanged). Within each column, cards SHALL be ordered by priority `urgent` first, then `high`, then `medium`, then `low`, preserving the original relative order for equal priorities; column order SHALL NOT change.

#### Scenario: Tasks are grouped by their state
- **WHEN** the board is loaded
- **THEN** each task card appears in the column that matches its state

#### Scenario: Column headers show task counts
- **WHEN** the board is loaded
- **THEN** each column header shows `LABEL (n)` with `n` equal to the number of tasks in that state

#### Scenario: Empty columns show zero
- **WHEN** no task is in a given state
- **THEN** that column header shows `LABEL (0)`

#### Scenario: Counts stay in sync with the board
- **WHEN** the board refreshes after a task move, creation, or edit
- **THEN** each column header count reflects the refreshed task list

#### Scenario: Cards are ordered by priority within a column
- **WHEN** a column contains tasks with priorities `low`, `urgent`, and `medium`
- **THEN** they render top-to-bottom as `urgent`, `medium`, `low`

#### Scenario: Equal priorities keep stable order
- **WHEN** two tasks share the same priority in one column
- **THEN** they render in their original relative order

### Requirement: Board effort summary
The web app SHALL show an effort-summary line under the board description in the form `TOTAL: X PTS - IN PROGRESS: N TASKS (Y PTS)`, where `X` is the sum of story points over all tasks, `N` is the number of tasks in `In Progress`, and `Y` is the sum of story points over tasks in `In Progress`. Tasks with `null` or missing story points SHALL count as `0`. The line SHALL refresh with the board data (creation, edit, move) like the column counts.

#### Scenario: Summary shows totals
- **WHEN** the board has tasks with `3`, `5`, and `null` points, two of them in `In Progress` with `5` and `null`
- **THEN** the line shows `TOTAL: 8 PTS - IN PROGRESS: 2 TASKS (5 PTS)`

#### Scenario: Empty board shows zeros
- **WHEN** the board has no tasks
- **THEN** the line shows `TOTAL: 0 PTS - IN PROGRESS: 0 TASKS (0 PTS)`

#### Scenario: Summary stays in sync
- **WHEN** the board refreshes after a task move, creation, or edit
- **THEN** the summary reflects the refreshed task list

### Requirement: Task creation and editing
The web app SHALL provide a `TaskModal` for creating and editing tasks with TITLE and DESCRIPTION fields, a PRIORITY selector offering `low`, `medium`, `high`, and `urgent`, a STORY PTS selector offering `--` (unestimated) plus `1`, `2`, `3`, `5`, `8`, and `13`, and an OWNER selector for managers. PRIORITY and STORY PTS SHALL sit side by side in one row. On create both selectors SHALL default to `medium` and `--` respectively; on edit they SHALL prefill from the task (missing reads as `medium` / `null`) and SHALL submit only when changed or on create. A blank title SHALL be rejected inline with no request. The owner field SHALL be shown only to the board creator or owner; for other members the task owner is the member themselves. The owner list SHALL include the board Creator, the Owner, and all Associated members, including the acting user selecting themself; the unselected option SHALL be labeled `(me)`. The modal SHALL be prefilled with the task's title, description, and current owner on edit; confirming SHALL save via the API and refetch the board so the updated attributes render. The owner field SHALL be editable only by the board creator or owner; a non-manager who owns the task edits the title, description, priority, and estimate only. On a frozen board (`Blocked`, `Cancelled`, `Done`) or on a terminal task the edit action SHALL NOT be offered.

#### Scenario: A task is created into To Do
- **WHEN** the user enters a title (and optionally a description and owner) and confirms
- **THEN** a task is created via the API and appears in the To Do column

#### Scenario: Blank title is rejected
- **WHEN** the user confirms the modal with a blank title
- **THEN** an error is shown and no request is sent

#### Scenario: Owner is only settable by the board creator or owner
- **WHEN** a member who is not the board creator or owner opens the modal
- **THEN** the owner field is hidden and any created task is owned by that member

#### Scenario: Owner list includes the creator and owner
- **WHEN** the board creator or owner opens the modal
- **THEN** the owner list shows the board Creator, the Owner, and all Associated members, including themselves as `(me)`

#### Scenario: New task defaults to medium priority
- **WHEN** a member opens the new-task modal
- **THEN** the PRIORITY selector shows `medium`

#### Scenario: New task defaults to unestimated
- **WHEN** a member opens the new-task modal
- **THEN** the STORY PTS selector shows `--`

#### Scenario: A task's title and description are edited
- **WHEN** the Task Owner or Board Creator/Owner activates the task, changes the title and/or description, and confirms
- **THEN** the changes are saved via the API and the board refetches so the card reflects them

#### Scenario: A task's owner is edited by a manager
- **WHEN** the Board Creator/Owner changes the owner in the edit modal and confirms
- **THEN** the task's owner is reassigned via the API and the card's owner avatar shows the new owner

#### Scenario: Edit modal prefills priority
- **WHEN** a manager opens a task with priority `high` for editing
- **THEN** the PRIORITY selector shows `high`

#### Scenario: Edit modal prefills estimate
- **WHEN** a manager opens a task with `8` story points for editing
- **THEN** the STORY PTS selector shows `8`

#### Scenario: Priority change is saved
- **WHEN** the owner changes priority to `urgent` and saves
- **THEN** the update request includes `urgent` and the board refreshes

#### Scenario: Estimate change is saved
- **WHEN** the owner changes story points to `5` and saves
- **THEN** the update request includes `5` and the board refreshes

#### Scenario: Estimate is cleared
- **WHEN** the owner changes story points to `--` and saves
- **THEN** the update request includes `null` and the board refreshes

#### Scenario: A non-manager task owner edits without an owner field
- **WHEN** a member who owns the task but is not the board creator or owner edits it
- **THEN** the owner field is hidden and the member can edit only the title, description, priority, and estimate

#### Scenario: Blank title is rejected in the edit modal
- **WHEN** the user clears the title and confirms the edit
- **THEN** an inline error is shown and no request is sent

#### Scenario: Task editing is hidden for other members
- **WHEN** a member who is neither the task owner nor the board creator or owner views the task
- **THEN** no edit action is offered on the task

#### Scenario: Frozen boards hide task editing
- **WHEN** a board is `Blocked`, `Cancelled`, or `Done`, or the task is terminal
- **THEN** no edit action is offered on the task
