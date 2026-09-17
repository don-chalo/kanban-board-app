## ADDED Requirements

### Requirement: Board title and description editing
The web app SHALL let the Board Creator or Owner edit the board title and description in place on the board detail page. Activating an editable field SHALL replace it with an input pre-filled with the current value; pressing Enter SHALL save the value via the API and apply the result locally without refetching; pressing Escape or leaving the input SHALL discard the edit. Non-managers SHALL NOT be offered editing. On a frozen board (`Blocked`, `Cancelled`, `Done`) editing SHALL NOT be offered. A blank title SHALL be rejected with an inline error and no request; a blank description SHALL be accepted. A failed save SHALL surface an inline error and leave the displayed value unchanged.

#### Scenario: Manager edits the title
- **WHEN** the Board Creator or Owner activates the title field, types a new title, and presses Enter
- **THEN** the title is saved via the API and the heading reflects the new title

#### Scenario: Manager edits the description
- **WHEN** the Board Creator or Owner activates the description field, types a new description, and presses Enter
- **THEN** the description is saved via the API and shown in place of any previous text or the "(no description)" placeholder

#### Scenario: Non-manager sees plain text only
- **WHEN** an Associated member opens a board
- **THEN** the title and description render as plain text with no editing affordance

#### Scenario: Escape cancels the edit
- **WHEN** a manager edits a field and presses Escape
- **THEN** the edit is discarded and the previous value is shown

#### Scenario: Defocus cancels the edit
- **WHEN** a manager edits a field and moves focus away without pressing Enter
- **THEN** the edit is discarded and the previous value is shown

#### Scenario: Frozen board is not editable
- **WHEN** a manager opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the title and description render as plain text with no editing affordance

#### Scenario: Blank title is rejected
- **WHEN** a manager clears the title and confirms the edit
- **THEN** an inline error is shown and no save request is sent

#### Scenario: Blank description is accepted
- **WHEN** a manager clears the description and presses Enter
- **THEN** the description is saved as empty and the "(no description)" placeholder is shown

#### Scenario: Save failure is surfaced
- **WHEN** the save request fails
- **THEN** an inline error is shown and the displayed value is unchanged