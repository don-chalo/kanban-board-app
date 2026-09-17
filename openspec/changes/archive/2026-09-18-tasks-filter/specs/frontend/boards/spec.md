## ADDED Requirements

### Requirement: Task columns text search
The web app SHALL provide a text field on the board detail page that filters the task cards across all columns as the user types. A task SHALL remain visible when the query is contained in its title, description, lifecycle-state label, or owner email or id, matched case-insensitively; an empty query SHALL show all tasks. Column counts and the effort summary SHALL always reflect total tasks, unaffected by the search.

#### Scenario: Search filters by title
- **WHEN** the user types text contained in a task's title
- **THEN** only matching tasks remain visible across columns

#### Scenario: Search filters by description
- **WHEN** the user types text contained in a task's description
- **THEN** only matching tasks remain visible across columns

#### Scenario: Search matches state and owner
- **WHEN** the user types text contained in a state label or an owner email
- **THEN** the corresponding tasks remain visible

#### Scenario: Search is case-insensitive
- **WHEN** the user types in a different case than the stored text
- **THEN** matching tasks still remain visible

#### Scenario: Clearing restores all tasks
- **WHEN** the user clears the search field
- **THEN** all tasks are visible again

#### Scenario: Counts ignore the search
- **WHEN** a search hides tasks
- **THEN** column counts and the effort summary still show totals
