## Purpose

Tasks are the unit of work within a board; each task carries a creator, an owner, and a lifecycle that determines what can happen to it.

## ADDED Requirements

### Requirement: Task entity
A Task SHALL belong to exactly one Board and SHALL have exactly one Creator and one Owner, both Users. The initial Owner SHALL be the Creator.

#### Scenario: Task is created with the creator as owner
- **WHEN** a member creates a task on a board
- **THEN** the task records that member as both Creator and Owner

#### Scenario: Task belongs to exactly one board
- **WHEN** a task exists
- **THEN** it is associated with exactly one board

### Requirement: Task ownership may be reassigned
The Board Creator or Board Owner SHALL be able to reassign the Task Owner to another user. A Task Owner SHALL be a member (Creator, Owner, or Associated) of the task's board.

#### Scenario: Board owner reassigns a task owner
- **WHEN** a Board Owner assigns the task to another board member
- **THEN** the task's Owner becomes that member

#### Scenario: Task owner must be a board member
- **WHEN** a user attempts to assign a task to a user who is not a member of the board
- **THEN** the assignment is rejected

### Requirement: Task lifecycle
A Task SHALL follow this lifecycle: `To Do` -> `In Progress` -> `Done`; from `To Do` or `In Progress` the task MAY transition to `Blocked` or `Cancelled`. A `Blocked` task SHALL transition only to the state it was in before it was blocked. `Done` and `Cancelled` SHALL be terminal states, and a task in a terminal state SHALL NOT be edited or moved.

#### Scenario: Task progresses to done
- **WHEN** a task in `To Do` moves to `In Progress` and then to `Done`
- **THEN** the task is in the terminal state `Done`

#### Scenario: Blocked task from To Do returns to To Do
- **WHEN** a `To Do` task is blocked and then unblocked
- **THEN** it returns to `To Do`

#### Scenario: Blocked task from In Progress returns to In Progress
- **WHEN** an `In Progress` task is blocked and then unblocked
- **THEN** it returns to `In Progress`

#### Scenario: Backtracking and cross transitions are rejected
- **WHEN** a user attempts to move a task from `In Progress` back to `To Do`, or from `Blocked` directly to `Done` or `Cancelled`
- **THEN** the transition is rejected

#### Scenario: Cancelled task is terminal and read-only
- **WHEN** a task is `Cancelled`
- **THEN** it cannot be edited, moved, or reactivated, but remains visible

#### Scenario: Done task is terminal and read-only
- **WHEN** a task is `Done`
- **THEN** it cannot be edited or moved