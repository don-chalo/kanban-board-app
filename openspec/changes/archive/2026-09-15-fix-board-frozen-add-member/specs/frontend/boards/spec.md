## MODIFIED Requirements

### Requirement: Member addition
The web app SHALL let the Board Creator or Owner add an Associated member from the MEMBERS panel. The panel SHALL show a "+" action visible only to the Creator/Owner and only when the board is not frozen (`Blocked`, `Cancelled`, `Done`); activating it SHALL reveal an inline email entry with autocomplete suggestions. Committing an email SHALL resolve its identity (a chosen suggestion, or a newly created identity via the API for a fresh email) and add the member via the API, after which the board SHALL refetch so the new member appears in the MEMBERS list and in task owner options. Non-managers SHALL NOT see the "+" action and no add affordance SHALL be shown on a frozen board. Errors (duplicate member, creator/owner email, unknown email, request failure, or `409 read_only` on frozen) SHALL be shown without losing the entered email.

#### Scenario: Manager sees the add action
- **WHEN** the Board Creator or Owner opens a board in `To Do` or `In Progress`
- **THEN** the MEMBERS panel shows a "+" add action

#### Scenario: Frozen board hides the add action
- **WHEN** the Board Creator or Owner opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** no "+" add action is shown

#### Scenario: Non-manager sees no add action
- **WHEN** an Associated member opens a board
- **THEN** no "+" add action is shown

#### Scenario: Autocomplete suggests matching identities
- **WHEN** the manager types an email prefix in the entry
- **THEN** matching identities are offered as suggestions

#### Scenario: A member is added by email
- **WHEN** the manager picks a suggestion or commits a fresh email and confirms on a non-frozen board
- **THEN** the member is added to the board and appears in the MEMBERS list after the board refetches

#### Scenario: Duplicate member is rejected
- **WHEN** the manager enters an email that is already on the board
- **THEN** an error is shown and no add request is sent

#### Scenario: Add failure is surfaced
- **WHEN** the add request fails
- **THEN** an error message is shown and the board is unchanged

### Requirement: Board title and description editing
The web app SHALL let the Board Creator or Owner edit the board title and description in place on the board detail page. Activating an editable field SHALL replace it with an input pre-filled with the current value; pressing Enter SHALL save the value via the API and apply the result locally without refetching; pressing Escape or leaving the input SHALL discard the edit. Non-managers SHALL NOT be offered editing. Editing the board title on a frozen board (`Blocked`, `Cancelled`, `Done`) SHALL NOT be offered; editing the board description on a frozen board SHALL remain offered to the Creator/Owner. A blank title SHALL be rejected with an inline error and no request; a blank description SHALL be accepted. A failed save (including `409 read_only` for title on frozen) SHALL surface an inline error and leave the displayed value unchanged.

#### Scenario: Manager edits the title
- **WHEN** the Board Creator or Owner activates the title field on a non-frozen board, types a new title, and presses Enter
- **THEN** the title is saved via the API and the heading reflects the new title

#### Scenario: Manager edits the description
- **WHEN** the Board Creator or Owner activates the description field, types a new description, and presses Enter
- **THEN** the description is saved via the API and shown in place of any previous text or the "(no description)" placeholder

#### Scenario: Description remains editable on a frozen board
- **WHEN** the Board Creator or Owner opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the description field remains editable while the title field renders as plain text

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
- **THEN** the title renders as plain text with no editing affordance while the description remains editable

#### Scenario: Frozen board title is not editable
- **WHEN** a manager opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** the title renders as plain text with no editing affordance

#### Scenario: Blank title is rejected
- **WHEN** a manager clears the title and confirms the edit
- **THEN** an inline error is shown and no save request is sent

#### Scenario: Blank description is accepted
- **WHEN** a manager clears the description and presses Enter
- **THEN** the description is saved as empty and the "(no description)" placeholder is shown

#### Scenario: Save failure is surfaced
- **WHEN** the save request fails
- **THEN** an inline error is shown and the displayed value is unchanged
