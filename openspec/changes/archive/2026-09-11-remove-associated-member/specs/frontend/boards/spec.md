## ADDED Requirements

### Requirement: Member removal
The web app SHALL let the Board Creator or Owner remove an Associated member from the MEMBERS panel. Each associated member row SHALL reveal an "X" action on hover; activating it SHALL remove the member via the API and update the board without refetching. When the member owns tasks on the board, a confirmation SHALL be requested before removal and the member SHALL be removed only when the manager confirms. Non-managers SHALL NOT see the "X" action. On a frozen board (`Blocked`, `Cancelled`, `Done`) the action SHALL NOT be offered.

#### Scenario: Manager sees the remove action on hover
- **WHEN** the Board Creator or Owner hovers over an Associated member row
- **THEN** an "X" action is revealed on that row

#### Scenario: Non-manager sees no remove action
- **WHEN** an Associated member hovers over any member row
- **THEN** no "X" action is revealed

#### Scenario: Frozen board hides the remove action
- **WHEN** a manager hovers over an Associated member row on a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** no "X" action is revealed

#### Scenario: Member without tasks is removed immediately
- **WHEN** the manager activates the "X" action on an Associated member who owns no tasks
- **THEN** the member is removed via the API and disappears from the MEMBERS list

#### Scenario: Confirmation is requested when the member owns tasks
- **WHEN** the manager activates the "X" action on an Associated member who owns tasks
- **THEN** a confirmation dialog is shown naming the member, and choosing Yes removes the member via the API while Cancel discards the removal