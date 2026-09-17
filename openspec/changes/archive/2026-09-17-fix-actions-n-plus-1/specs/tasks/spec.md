## MODIFIED Requirements

### Requirement: Task lifecycle
A Task SHALL follow this lifecycle: `To Do` -> `In Progress` -> `Done`; from `To Do` the task MAY transition to `Cancelled`; from `In Progress` the task MAY transition to `Blocked` or `Cancelled`. A `Blocked` task SHALL transition only to `In Progress`. `Done` and `Cancelled` SHALL be terminal states, and a task in a terminal state SHALL NOT be edited or moved.

#### Scenario: Task progresses to done
- **WHEN** a task in `To Do` moves to `In Progress` and then to `Done`
- **THEN** the task is in the terminal state `Done`

#### Scenario: Blocked task from In Progress returns to In Progress
- **WHEN** an `In Progress` task is blocked and then unblocked
- **THEN** it returns to `In Progress`

#### Scenario: Blocked task from To Do returns to To Do
- **WHEN** a user attempts to block a `To Do` task
- **THEN** the transition is rejected and the task stays in `To Do`

#### Scenario: Backtracking and cross transitions are rejected
- **WHEN** a user attempts to move a task from `In Progress` back to `To Do`, or from `Blocked` directly to `To Do`, `Done` or `Cancelled`
- **THEN** the transition is rejected

#### Scenario: Cancelled task is terminal and read-only
- **WHEN** a task is `Cancelled`
- **THEN** it cannot be edited, moved, or reactivated, but remains visible

#### Scenario: Done task is terminal and read-only
- **WHEN** a task is `Done`
- **THEN** it cannot be edited or moved

### Requirement: Task start date is stamped once
`startedAt` SHALL be set exactly once when a task moves from `To Do` to `In Progress` while `startedAt` is `null`, using the current time as ISO string. It SHALL NOT be overwritten on any later transition, including returns from `Blocked` to `In Progress`. Transitions other than `To Do -> In Progress` SHALL NOT set it.

#### Scenario: First start stamps the date
- **WHEN** a task in `To Do` with `startedAt null` moves to `In Progress`
- **THEN** its `startedAt` becomes the current ISO time

#### Scenario: Return from Blocked does not overwrite
- **WHEN** a task with a set `startedAt` moves `In Progress -> Blocked -> In Progress`
- **THEN** its `startedAt` is unchanged

#### Scenario: Non-start transitions do not stamp
- **WHEN** a task moves `To Do -> Cancelled`
- **THEN** its `startedAt` stays `null`
