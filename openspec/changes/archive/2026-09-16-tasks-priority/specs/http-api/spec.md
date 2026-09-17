## MODIFIED Requirements

### Requirement: Task creation, reading, editing, and deletion
Board members SHALL create tasks via `POST /boards/:boardId/tasks` and read them via `GET /boards/:boardId/tasks` and `GET /boards/:boardId/tasks/:taskId`. The Task Owner, and the Board Creator/Owner, SHALL edit a task via `PATCH /boards/:boardId/tasks/:taskId`. Only the Board Creator/Owner SHALL delete a task via `DELETE /boards/:boardId/tasks/:taskId`. A task title SHALL never be blank: a blank title on create or edit SHALL be rejected with `400`. Both `POST` and `PATCH` SHALL accept an optional `priority` of `low | medium | high | urgent`; an omitted priority on create SHALL default to `medium`, and an invalid priority SHALL be rejected with `400` and `validation`. Tasks persisted without a priority SHALL be returned as `medium`.

#### Scenario: Task is created with default priority
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and no priority
- **THEN** the API responds `201` and the task priority is `medium`

#### Scenario: Task is created with explicit priority
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with a title and priority `urgent`
- **THEN** the API responds `201` and the task priority is `urgent`

#### Scenario: Invalid priority on create is rejected
- **WHEN** a board member sends `POST /boards/:boardId/tasks` with priority `critical`
- **THEN** the API responds `400` with `validation` and no task is created

#### Scenario: Task owner edits the task
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with a title and/or description
- **THEN** the API applies the title and/or description changes

#### Scenario: Task priority is edited
- **WHEN** the Task Owner sends `PATCH /boards/:boardId/tasks/:taskId` with priority `high`
- **THEN** the task priority becomes `high`

#### Scenario: Invalid priority on edit is rejected
- **WHEN** a user sends `PATCH /boards/:boardId/tasks/:taskId` with priority ` ASAP `
- **THEN** the API responds `400` with `validation` and the task is unchanged
