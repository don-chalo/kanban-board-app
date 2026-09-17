## MODIFIED Requirements

### Requirement: Task entity
A Task SHALL belong to exactly one Board and SHALL have exactly one Creator and one Owner, both Users. The initial Owner SHALL be the Creator. Each Task SHALL have a priority of `low`, `medium`, `high`, or `urgent`, defaulting to `medium`. A task persisted without a priority SHALL be treated as `medium` on read. Each Task SHALL have a `startedAt` of ISO string or `null`, defaulting to `null`. A task persisted without `startedAt` SHALL be treated as `null` on read. Each Task SHALL have `storyPoints` of `1`, `2`, `3`, `5`, `8`, `13`, or `null`, defaulting to `null` (`null` = unestimated). A task persisted without `storyPoints` SHALL be treated as `null` on read.

#### Scenario: Task is created with the creator as owner
- **WHEN** a member creates a task on a board
- **THEN** the task records that member as both Creator and Owner

#### Scenario: Task belongs to exactly one board
- **WHEN** a task exists
- **THEN** it is associated with exactly one board

#### Scenario: New task defaults to medium priority
- **WHEN** a member creates a task without a priority
- **THEN** the task priority is `medium`

#### Scenario: Task created with an explicit priority
- **WHEN** a member creates a task with `high`
- **THEN** the task priority is `high`

#### Scenario: Legacy task without priority reads as medium
- **WHEN** a task persisted without a priority is read
- **THEN** it is treated as `medium`

#### Scenario: New task has no start date
- **WHEN** a member creates a task
- **THEN** its `startedAt` is `null`

#### Scenario: Legacy task without start date reads as null
- **WHEN** a task persisted without `startedAt` is read
- **THEN** it is treated as `null`

#### Scenario: New task has no estimate
- **WHEN** a member creates a task without story points
- **THEN** its `storyPoints` is `null`

#### Scenario: Task created with an explicit estimate
- **WHEN** a member creates a task with `5` story points
- **THEN** its `storyPoints` is `5`

#### Scenario: Legacy task without estimate reads as null
- **WHEN** a task persisted without `storyPoints` is read
- **THEN** it is treated as `null`

### Requirement: Task priority may be edited
A Task Owner, and the Board Creator/Owner, SHALL be able to change a task's priority via the same authorization and editability rules as editing the task (no frozen board, no terminal task). An invalid priority value SHALL be rejected.

#### Scenario: Task owner changes priority
- **WHEN** the Task Owner edits the task with priority `urgent`
- **THEN** the task priority becomes `urgent`

#### Scenario: Invalid priority is rejected
- **WHEN** a user attempts to set a priority outside `low | medium | high | urgent`
- **THEN** the change is rejected

### Requirement: Task start date is stamped once
`startedAt` SHALL be set exactly once when a task moves from `To Do` to `In Progress` while `startedAt` is `null`, using the current time as ISO string. It SHALL NOT be overwritten on any later transition, including returns from `Blocked` to `In Progress`. Transitions other than `To Do -> In Progress` SHALL NOT set it.

#### Scenario: First start stamps the date
- **WHEN** a task in `To Do` with `startedAt null` moves to `In Progress`
- **THEN** its `startedAt` becomes the current ISO time

#### Scenario: Return from Blocked does not overwrite
- **WHEN** a task with a set `startedAt` moves `In Progress -> Blocked -> In Progress`
- **THEN** its `startedAt` is unchanged

#### Scenario: Non-start transitions do not stamp
- **WHEN** a task moves `To Do -> Blocked` or `To Do -> Cancelled`
- **THEN** its `startedAt` stays `null`

### Requirement: Task estimate may be edited
A Task Owner, and the Board Creator/Owner, SHALL be able to change a task's story points via the same authorization and editability rules as editing the task (no frozen board, no terminal task). A value outside `1 | 2 | 3 | 5 | 8 | 13` SHALL be rejected, except `null` which clears the estimate. For sums, `null` SHALL count as `0`.

#### Scenario: Task owner sets an estimate
- **WHEN** the Task Owner edits the task with `8` story points
- **THEN** its `storyPoints` becomes `8`

#### Scenario: Estimate is cleared
- **WHEN** the Task Owner edits the task with `null` story points
- **THEN** its `storyPoints` becomes `null`

#### Scenario: Invalid estimate is rejected
- **WHEN** a user attempts to set story points to `4` or `0`
- **THEN** the change is rejected
