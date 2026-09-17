## REMOVED Requirements

### Requirement: Blank board detail route
**Reason**: Superseded by the real board detail page.
**Migration**: Navigating to `/boards/:boardId` now shows the board detail page with the identity panel, the five state columns, task cards, creation modal, and move controls described in this delta.

## ADDED Requirements

### Requirement: Board detail display
The web app SHALL display a board detail page that shows the board's title in a large heading, its description directly below it (with a placeholder when empty), and an always-visible identity panel listing the board creator, the board owner, and the associated members.

#### Scenario: Board title and description are shown
- **WHEN** a member opens a board
- **THEN** a large title and a description line render in the page head

#### Scenario: Empty description shows a placeholder
- **WHEN** the board has no description
- **THEN** a "(no description)" hint is shown instead of blank space

#### Scenario: Identity panel lists the members
- **WHEN** a member opens a board
- **THEN** the identity panel shows the creator, the owner, and the associated members

### Requirement: Board state control
The identity panel SHALL show the board's current lifecycle state in a select whose selectable options are exactly the legal target states, and SHALL NOT allow invalid moves. On a terminal board the select SHALL be disabled while still displaying the current state. Choosing a legal target SHALL submit the move and refresh the board.

#### Scenario: Current state is shown with legal moves only
- **WHEN** a member opens a board in a non-terminal state
- **THEN** the select displays the current state and offers only the legal target states

#### Scenario: Terminal board locks the select
- **WHEN** a board is `Done` or `Cancelled`
- **THEN** the select is disabled but still shows the current state

#### Scenario: State change is applied and reflected
- **WHEN** the user selects a legal target state
- **THEN** the state change is submitted to the API and the board is refreshed to show the new state

### Requirement: Task columns
The web app SHALL render one column per lifecycle state (To Do, In Progress, Done, Blocked, Cancelled) and SHALL place each task card in the column matching that task's current state.

#### Scenario: Tasks are grouped by their state
- **WHEN** the board is loaded
- **THEN** each task card appears in the column that matches its state

### Requirement: Task card
A task card SHALL show the task's title (truncated when long) and its lifecycle state, an owner avatar showing the first letter of the owner's email with a tooltip revealing the full email, and a right-side arrow that appears when the pointer hovers the card.

#### Scenario: Card shows title, state, and owner avatar
- **WHEN** a task card renders
- **THEN** the title, the state, and the owner's avatar are visible, and hovering the avatar shows the owner's email

#### Scenario: Long titles are truncated
- **WHEN** a task title exceeds the column width
- **THEN** the title is clipped with an ellipsis instead of wrapping

### Requirement: Task state move
When the user clicks a card's arrow, the web app SHALL show a dropdown of that task's legal target states; choosing one SHALL submit the move and refresh the board so the card relocates to the new column. When no moves are legal the arrow SHALL be disabled.

#### Scenario: Legal moves are offered
- **WHEN** the user clicks a card's arrow on an editable task
- **THEN** a dropdown lists the task's legal target states

#### Scenario: A move relocates the task
- **WHEN** the user picks a legal target
- **THEN** the move is submitted to the API and the board refreshes so the card appears in the new column

#### Scenario: No moves disable the arrow
- **WHEN** the task or the board is frozen (`Blocked`, `Cancelled`, `Done`) or the task is terminal
- **THEN** the card's arrow is disabled

### Requirement: Task creation
The web app SHALL provide a new-task action that opens a modal with a required title and optional description and owner; a created task SHALL appear in the To Do column. The owner field SHALL be shown only to the board creator or owner; for other members the task owner is the member themselves.

#### Scenario: A task is created into To Do
- **WHEN** the user enters a title (and optionally a description and owner) and confirms
- **THEN** a task is created via the API and appears in the To Do column

#### Scenario: Blank title is rejected
- **WHEN** the user confirms the modal with a blank title
- **THEN** an error is shown and no request is sent

#### Scenario: Owner is only settable by the board creator or owner
- **WHEN** a member who is not the board creator or owner opens the modal
- **THEN** the owner field is hidden and any created task is owned by that member

### Requirement: Read-only board rendering
The web app SHALL render a board in `Blocked`, `Cancelled`, or `Done` as read-only: the new-task action and task move arrows SHALL be disabled, and on terminal boards the state select SHALL also be disabled.

#### Scenario: Frozen board renders read-only
- **WHEN** a board is `Blocked`, `Cancelled`, or `Done`
- **THEN** the new-task action and all task move arrows are disabled

#### Scenario: Terminal board additionally locks the state select
- **WHEN** a board is `Done` or `Cancelled`
- **THEN** the state select is disabled while still showing the state