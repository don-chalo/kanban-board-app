## ADDED Requirements

### Requirement: Member addition
The web app SHALL let the Board Creator or Owner add an Associated member from the MEMBERS panel. The panel SHALL show a "+" action visible only to the Creator/Owner; activating it SHALL reveal an inline email entry with autocomplete suggestions. Committing an email SHALL resolve its identity (a chosen suggestion, or a newly created identity via the API for a fresh email) and add the member via the API, after which the board SHALL refetch so the new member appears in the MEMBERS list and in task owner options. Non-managers SHALL NOT see the "+" action. Errors (duplicate member, creator/owner email, unknown email, request failure) SHALL be shown without losing the entered email.

#### Scenario: Manager sees the add action
- **WHEN** the Board Creator or Owner opens a board
- **THEN** the MEMBERS panel shows a "+" add action

#### Scenario: Non-manager sees no add action
- **WHEN** an Associated member opens a board
- **THEN** no "+" add action is shown

#### Scenario: Autocomplete suggests matching identities
- **WHEN** the manager types an email prefix in the entry
- **THEN** matching identities are offered as suggestions

#### Scenario: A member is added by email
- **WHEN** the manager picks a suggestion or commits a fresh email and confirms
- **THEN** the member is added to the board and appears in the MEMBERS list after the board refetches

#### Scenario: Duplicate member is rejected
- **WHEN** the manager enters an email that is already on the board
- **THEN** an error is shown and no add request is sent

#### Scenario: Add failure is surfaced
- **WHEN** the add request fails
- **THEN** an error message is shown and the board is unchanged