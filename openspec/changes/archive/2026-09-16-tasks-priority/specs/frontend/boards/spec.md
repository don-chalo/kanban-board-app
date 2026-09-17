## MODIFIED Requirements

### Requirement: Task card
A task card SHALL show the task's title (truncated when long) and its lifecycle state, an owner avatar showing the first letter of the owner's email with a tooltip revealing the full email, a right-side arrow that appears when the pointer hovers the card, and an always-visible priority badge showing only the initial letter (`L` for `low`, `M` for `medium`, `H` for `high`, `U` for `urgent`). The badge SHALL expose the full priority word via its accessible name and tooltip. A task without a priority SHALL render as `M`.

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

### Requirement: Task creation and editing
The web app SHALL provide a `TaskModal` for creating and editing tasks with TITLE and DESCRIPTION fields, a PRIORITY selector offering `low`, `medium`, `high`, and `urgent`, and an OWNER selector for managers. On create the selector SHALL default to `medium`; on edit it SHALL prefill from the task (missing reads as `medium`) and SHALL submit the priority only when it changed or on create. A blank title SHALL be rejected inline with no request.

#### Scenario: New task defaults to medium priority
- **WHEN** a member opens the new-task modal
- **THEN** the PRIORITY selector shows `medium`

#### Scenario: Edit modal prefills priority
- **WHEN** a manager opens a task with priority `high` for editing
- **THEN** the PRIORITY selector shows `high`

#### Scenario: Priority change is saved
- **WHEN** the owner changes priority to `urgent` and saves
- **THEN** the update request includes `urgent` and the board refreshes
