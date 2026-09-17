## MODIFIED Requirements

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