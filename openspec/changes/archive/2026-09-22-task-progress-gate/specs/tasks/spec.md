## MODIFIED Requirements

### Requirement: Task lifecycle
A Task SHALL follow this lifecycle: `To Do` -> `In Progress` -> `Done`; from `To Do` the task MAY transition to `Cancelled`; from `In Progress` the task MAY transition to `Blocked` or `Cancelled`. A `Blocked` task SHALL transition only to `In Progress`. `Done` and `Cancelled` SHALL be terminal states, and a task in a terminal state SHALL NOT be edited or moved. A task SHALL transition between states only while its board is `In Progress`; on any other board state moves are rejected even when the arc itself is legal. Creating tasks is unaffected by the board state gate.

#### Scenario: Task progresses to done
- **WHEN** a task in `To Do` moves to `In Progress` and then to `Done`
- **THEN** the task is in the terminal state `Done`

#### Scenario: Blocked task from To Do returns to To Do
- **WHEN** a user attempts to block a `To Do` task
- **THEN** the transition is rejected and the task stays in `To Do`

#### Scenario: Blocked task from In Progress returns to In Progress
- **WHEN** an `In Progress` task is blocked and then unblocked
- **THEN** it returns to `In Progress`

#### Scenario: Backtracking and cross transitions are rejected
- **WHEN** a user attempts to move a task from `In Progress` back to `To Do`, or from `Blocked` directly to `To Do`, `Done` or `Cancelled`
- **THEN** the transition is rejected

#### Scenario: Task cannot move while its board is not In Progress
- **WHEN** a user attempts to move a task on a board in `To Do` (or any frozen state)
- **THEN** the transition is rejected even when the target arc is legal

#### Scenario: Cancelled task is terminal and read-only
- **WHEN** a task is `Cancelled`
- **THEN** it cannot be edited, moved, or reactivated, but remains visible

#### Scenario: Done task is terminal and read-only
- **WHEN** a task is `Done`
- **THEN** it cannot be edited or moved
