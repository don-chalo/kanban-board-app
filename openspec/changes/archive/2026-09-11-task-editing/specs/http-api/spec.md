## MODIFIED Requirements

### Requirement: Task creation, reading, editing, and deletion
Board members SHALL create tasks via `POST /boards/:boardId/tasks` and read them via `GET /boards/:boardId/tasks` and `GET /boards/:boardId/tasks/:taskId`. The Task Owner, and the Board Creator/Owner, SHALL edit a task via `PATCH /boards/:boardId/tasks/:taskId`. Only the Board Creator/Owner SHALL delete a task via `DELETE /boards/:boardId/tasks/:taskId`. A task title SHALL never be blank: a blank title on create or edit SHALL be rejected with `400`.

#### Scenario: Member creates a task
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title
- **THEN** a task is created, owned by that member, in state `To Do`

#### Scenario: Task owner edits the task
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with a title and/or description
- **THEN** the task's title and/or description are updated

#### Scenario: Board creator deletes a task
- **WHEN** a Board Creator or Owner sends `DELETE /boards/:boardId/tasks/:taskId`
- **THEN** the task is permanently removed

#### Scenario: Associated member cannot delete
- **WHEN** an Associated member sends `DELETE /boards/:boardId/tasks/:taskId`
- **THEN** the deletion is rejected

#### Scenario: Blank task title is rejected on edit
- **WHEN** a user sends `PATCH /boards/:boardId/tasks/:taskId` with a blank title
- **THEN** the API responds with `400` and does not update the task