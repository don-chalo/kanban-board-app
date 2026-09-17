## MODIFIED Requirements

### Requirement: Task columns
The web app SHALL render one column per lifecycle state (To Do, In Progress, Done, Blocked, Cancelled) and SHALL place each task card in the column matching that task's current state. Each column header SHALL display the state label followed by the task count in the form `LABEL (n)`, where `n` is the number of tasks currently in that state; the `(n)` suffix SHALL always be visible, including `(0)` for empty columns, and SHALL be rendered in an attenuated style. The column accessible name SHALL remain the bare state label (unchanged).

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
