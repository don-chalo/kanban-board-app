# Tasks Specification

## Purpose

Tasks are the unit of work within a board; each task carries a creator, an owner, a priority, and a lifecycle that determines what can happen to it.

## Requirements

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

### Requirement: Task ownership may be reassigned
The Board Creator or Board Owner SHALL be able to reassign the Task Owner to another user. A Task Owner SHALL be a member (Creator, Owner, or Associated) of the task's board.

#### Scenario: Board owner reassigns a task owner
- **WHEN** a Board Owner assigns the task to another board member
- **THEN** the task's Owner becomes that member

#### Scenario: Task owner must be a board member
- **WHEN** a user attempts to assign a task to a user who is not a member of the board
- **THEN** the assignment is rejected

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
- **WHEN** a task moves `To Do -> Cancelled`
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

### Requirement: Task comments
A Task SHALL carry an embedded thread of zero or more comments, each with a stable id, an author (User), text, and a creation timestamp. Any board member SHALL be able to add a comment, including on a frozen board (`Blocked`, `Cancelled`, `Done`) or a terminal task. A comment SHALL be editable and removable by its author, by the Board Creator/Owner, or by the task owner — including on a frozen board or a terminal task. Comment text SHALL never be blank and SHALL NOT exceed 2000 characters.

#### Scenario: Member adds a comment
- **WHEN** a board member submits non-blank text within the limit on a task
- **THEN** the comment is appended to the task's thread with that member as author

#### Scenario: Blank comment is rejected
- **WHEN** a user submits blank or whitespace-only text
- **THEN** the comment is rejected and the thread is unchanged

#### Scenario: Overlong comment is rejected
- **WHEN** a user submits text over 2000 characters
- **THEN** the comment is rejected and the thread is unchanged

#### Scenario: Author edits their comment
- **WHEN** the comment author submits new valid text
- **THEN** the comment's text is updated

#### Scenario: Manager edits any comment
- **WHEN** the Board Creator or Owner submits new valid text on another member's comment
- **THEN** the comment's text is updated

#### Scenario: Task owner edits a comment on their task
- **WHEN** the task owner submits new valid text on another member's comment on their task
- **THEN** the comment's text is updated

#### Scenario: Unrelated member cannot edit
- **WHEN** a member who is neither the author, the Board Creator/Owner, nor the task owner attempts to edit a comment
- **THEN** the edit is rejected and the comment is unchanged

#### Scenario: Author removes their comment
- **WHEN** the comment author removes it
- **THEN** the comment is permanently removed from the thread

#### Scenario: Manager or task owner removes any comment
- **WHEN** the Board Creator/Owner or the task owner removes another member's comment
- **THEN** the comment is permanently removed from the thread

#### Scenario: Commenting works on a frozen board or terminal task
- **WHEN** the board is `Blocked`, `Cancelled`, or `Done`, or the task is terminal
- **THEN** members can still add, edit, and remove comments per the rules above