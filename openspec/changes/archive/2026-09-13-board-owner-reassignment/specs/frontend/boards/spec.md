## ADDED Requirements

### Requirement: Board owner reassignment
The web app SHALL let the Board Creator/Owner reassign the board owner by activating the OWNER row in the identity panel, which SHALL open a dropdown listing the board's current members (the Creator, the current Owner, and all Associated members), with the current owner preselected. Choosing a different member SHALL submit the reassignment via the API and SHALL update the panel so the new owner appears in the OWNER row. The option SHALL be offered only to the Board Creator/Owner and only on a board that is not frozen (`Blocked`, `Cancelled`, `Done`); other members SHALL see the OWNER value as plain text, and a frozen board SHALL NOT offer the dropdown.

#### Scenario: Manager reassigns the owner
- **WHEN** the Board Creator/Owner picks a different member in the owner dropdown
- **THEN** ownership is reassigned via the API and the OWNER row shows the new member

#### Scenario: Owner dropdown lists only board members
- **WHEN** the Board Creator/Owner opens the owner dropdown
- **THEN** the dropdown lists the board Creator, the current Owner, and all Associated members, with the current owner preselected

#### Scenario: Non-manager sees the owner as plain text
- **WHEN** an Associated member opens a board
- **THEN** the OWNER value renders as plain text with no dropdown

#### Scenario: Frozen board hides the owner dropdown
- **WHEN** the Board Creator/Owner opens a board in `Blocked`, `Cancelled`, or `Done`
- **THEN** no owner dropdown is offered