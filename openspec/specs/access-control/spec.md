# Access Control Specification

## Purpose

Access control specifies who may take which action on boards and tasks, combining board roles (Creator, Owner, Associated) with task ownership.

## Requirements

### Requirement: Board membership grants full task visibility
All members of a board (Creator, Owner, and Associated users) SHALL be able to see every task on the board. Users who are not members of a board SHALL have no access to the board or its tasks.

#### Scenario: Associated member sees all tasks
- **WHEN** an Associated member views a board
- **THEN** they can see every task on the board, including ones they do not own

#### Scenario: Non-member has no access
- **WHEN** a user who is not a member of a board attempts to view its tasks
- **THEN** access is denied

### Requirement: Any member may create tasks
Every board member SHALL be able to create tasks on a board.

#### Scenario: Associated member creates a task
- **WHEN** an Associated member creates a task on the board
- **THEN** the task is created with that member as Creator and Owner

### Requirement: Edit and move privileges are scoped by ownership
A Task Owner SHALL be able to edit attributes of, and move (change the lifecycle state of) the tasks they own. A Board Creator or Board Owner SHALL be able to edit and move any task on their board. An Associated member SHALL edit and move only the tasks they own.

#### Scenario: Task owner edits and moves their own task
- **WHEN** the Task Owner edits a task attribute or changes its state
- **THEN** the edit or move succeeds

#### Scenario: Associated member cannot edit another member's task
- **WHEN** an Associated member attempts to edit a task owned by another user
- **THEN** the edit is rejected

#### Scenario: Board owner edits any task
- **WHEN** a Board Owner edits a task owned by any member
- **THEN** the edit succeeds

### Requirement: Task deletion is reserved to the Board Creator/Owner
No user SHALL delete a task except the Board Creator or Board Owner. Task Owners and Associated members SHALL NOT be able to delete tasks.

#### Scenario: Board owner deletes a task
- **WHEN** a Board Owner deletes a task
- **THEN** the task is removed

#### Scenario: Associated member cannot delete
- **WHEN** an Associated member attempts to delete any task
- **THEN** the deletion is rejected

#### Scenario: Task owner cannot delete
- **WHEN** the Task Owner attempts to delete a task
- **THEN** the deletion is rejected

### Requirement: Removed tasks are not recoverable
A deleted task SHALL be permanently removed.

#### Scenario: Deleted task is gone
- **WHEN** a Board Owner deletes a task
- **THEN** the task no longer appears anywhere in the product

### Requirement: Task ownership reassignment is reserved to the Board Creator/Owner
Only the Board Creator or Board Owner SHALL reassign a Task Owner.

#### Scenario: Board owner reassigns a task
- **WHEN** a Board Owner assigns a task to another member
- **THEN** the new owner is recorded

#### Scenario: Associated member cannot reassign
- **WHEN** an Associated member attempts to reassign a task
- **THEN** the reassignment is rejected

### Requirement: Board management is reserved to the Board Creator/Owner
Only the Board Creator or Board Owner SHALL edit board attributes (title and description), manage the Associated members, reassign the Board Owner, or change the board's lifecycle state.

#### Scenario: Board owner manages members
- **WHEN** a Board Owner adds or removes an Associated member
- **THEN** the membership changes

#### Scenario: Board owner changes board state
- **WHEN** a Board Owner changes the board lifecycle state
- **THEN** the state changes, subject to the board Done gate

#### Scenario: Associated member cannot manage the board
- **WHEN** an Associated member attempts to edit board attributes, manage members, reassign board ownership, or change board state
- **THEN** the action is rejected

#### Scenario: Board owner edits the description
- **WHEN** a Board Owner updates the board description
- **THEN** the description changes

#### Scenario: Board owner reassigns the board owner
- **WHEN** a Board Owner reassigns the board to another board member
- **THEN** the ownership changes