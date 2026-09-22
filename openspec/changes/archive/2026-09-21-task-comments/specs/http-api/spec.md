## ADDED Requirements

### Requirement: Task comment endpoints
The API SHALL create a task comment via `POST /boards/:boardId/tasks/:taskId/comments` with body `{ text }`, responding `201` with `{ id, author, text, createdAt }`; SHALL edit a comment via `PATCH /boards/:boardId/tasks/:taskId/comments/:commentId` with body `{ text }`; and SHALL remove a comment via `DELETE /boards/:boardId/tasks/:taskId/comments/:commentId`. The API SHALL return the task's comments embedded in task payloads. All three mutation endpoints SHALL require board membership (`403` for non-members, `401` for unknown actor) and a known task (`404` for a missing board, task, or comment); blank text or text over 2000 characters SHALL be `400` with `validation`; edits and removals by anyone other than the author, the Board Creator/Owner, or the task owner SHALL be `403`.

#### Scenario: Member creates a comment
- **WHEN** a board member sends `POST` with valid text on a task
- **THEN** the API responds `201` with the comment including author and timestamp

#### Scenario: Blank or overlong text is rejected
- **WHEN** a client sends blank text or text over 2000 characters
- **THEN** the API responds `400` with `validation` and the thread is unchanged

#### Scenario: Comment is edited
- **WHEN** the author, the Board Creator/Owner, or the task owner sends `PATCH` with valid text
- **THEN** the comment's text is updated

#### Scenario: Unauthorized edit is rejected
- **WHEN** any other member sends `PATCH` for the comment
- **THEN** the API responds `403` and the comment is unchanged

#### Scenario: Comment is removed
- **WHEN** the author, the Board Creator/Owner, or the task owner sends `DELETE`
- **THEN** the comment is removed

#### Scenario: Task payloads embed comments
- **WHEN** a member reads a task with comments
- **THEN** the response includes the task's comment thread

#### Scenario: Non-member has no access
- **WHEN** a user who is not a board member uses a task comment endpoint
- **THEN** the API denies access
