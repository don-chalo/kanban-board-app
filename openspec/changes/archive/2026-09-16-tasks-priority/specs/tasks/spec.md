## MODIFIED Requirements

### Requirement: Task entity
A Task SHALL belong to exactly one Board and SHALL have exactly one Creator and one Owner, both Users. The initial Owner SHALL be the Creator. Each Task SHALL have a priority of `low`, `medium`, `high`, or `urgent`, defaulting to `medium`. A task persisted without a priority SHALL be treated as `medium` on read.

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

### Requirement: Task priority may be edited
A Task Owner, and the Board Creator/Owner, SHALL be able to change a task's priority via the same authorization and editability rules as editing the task (no frozen board, no terminal task). An invalid priority value SHALL be rejected.

#### Scenario: Task owner changes priority
- **WHEN** the Task Owner edits the task with priority `urgent`
- **THEN** the task priority becomes `urgent`

#### Scenario: Invalid priority is rejected
- **WHEN** a user attempts to set a priority outside `low | medium | high | urgent`
- **THEN** the change is rejected
