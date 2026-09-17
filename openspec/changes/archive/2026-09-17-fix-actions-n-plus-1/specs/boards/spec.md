## MODIFIED Requirements

### Requirement: Board lifecycle
A Board SHALL follow the same lifecycle as a Task: `To Do` -> `In Progress` -> `Done`; from `To Do` the board MAY transition to `Cancelled`; from `In Progress` the board MAY transition to `Blocked` or `Cancelled`. A `Blocked` board SHALL transition only to `In Progress`. `Done` and `Cancelled` SHALL be terminal states. Board lifecycle state SHALL be an attribute of the board.

#### Scenario: Board progresses to done
- **WHEN** a board in `To Do` moves to `In Progress` and then to `Done`
- **THEN** the board is in the terminal state `Done`

#### Scenario: Board returns to its previous state after blocking
- **WHEN** a board in `In Progress` is set to `Blocked` and then unblocked
- **THEN** the board returns to `In Progress`; a board in `To Do` SHALL NOT enter `Blocked`

#### Scenario: Board is cancelled
- **WHEN** a board in `To Do` or `In Progress` is set to `Cancelled`
- **THEN** the board is in the terminal state `Cancelled`

#### Scenario: Board cannot skip to done
- **WHEN** a user attempts to move a board from `To Do` directly to `Done`
- **THEN** the transition is rejected

#### Scenario: Board cannot be blocked from To Do
- **WHEN** a user attempts to move a board from `To Do` directly to `Blocked`
- **THEN** the transition is rejected
