## Why

The kanban project has been scaffolded (React + Vite frontend, Express API) but has no defined domain. This change establishes the core domain model — User, Board, Task — and the business rules (roles, permissions, lifecycles, cascade) that every later layer (auth, API, UI) must respect. Without it, the two scaffolds have nothing to build against.

## What Changes

- Introduce the **User**, **Board**, and **Task** entities with their cardinalities: a User has 0..N Boards; a Board has 0..N Tasks and exactly one Owner and one Creator; a Task has exactly one Owner and one Creator.
- Define **board membership roles**: Creator (1), Owner (1), Associated (0..N).
- Define **task ownership**: default Owner is the Creator; the Board Creator/Owner may reassign the Task Owner; a Task Owner must be a board member.
- Define the **task lifecycle**: `To Do` -> `In Progress` -> `Done`; `To Do`/`In Progress` -> `Blocked` (returns only to its previous state); `To Do`/`In Progress` -> `Cancelled` (terminal). `Done` and `Cancelled` are terminal, read-only states; `Cancelled` is **not** a logical delete.
- Define the **board lifecycle** using the same state machine, with a **Done gate** (no live tasks) and **cascade semantics** (Board Blocked/Cancelled freeze tasks read-only without changing their states).
- Define a **permission matrix** covering who may see, create, edit, move, delete, and reassign tasks, and who may manage board attributes and state.
- Rule: **no user may delete a task except the Board Creator/Owner**; Associated and Task Owners cannot delete.

## Capabilities

### New Capabilities
- `users`: The User identity entity and its relationships (a User is a Member/Creator/Owner of Boards and Creator/Owner of Tasks).
- `boards`: The Board entity, membership roles (Creator, Owner, Associated), board lifecycle state machine, Done gate, and cascade to tasks.
- `tasks`: The Task entity, ownership rules, and the task lifecycle state machine.
- `access-control`: The role-based permission matrix governing every action on boards and tasks.

### Modified Capabilities
<!-- No existing capabilities (project has no specs yet). -->

## Impact

- `kanban-api`: new domain model (entities, role semantics, lifecycle state machines, authorization rules) as the foundation for the REST API.
- `kanban-front-end`: UI that models and enforces the same rules, with authorization-aware rendering (membership, ownership, edit/move/delete visibility).
- Future work enabled: authentication/session layer, board/task API endpoints, collaboration features.

### Assumptions recorded during exploration

- **Board -> Done gate treats Blocked tasks as blocking too**: a Board can move to `Done` only when every task is `Done` or `Cancelled` (a `Blocked` or otherwise live task prevents it), closing the loophole in the literal "no In Progress or To Do" wording.
- **Board in `Done` freezes its tasks read-only**, matching the Blocked/Cancelled cascade.
- **Board deletion** (as opposed to cancelling) is owned by the Board Creator/Owner; deleting a board cascades deletion of its tasks. Creation of a board lives with the creating user.
- **Board state changes require Creator/Owner privileges** (board lifecycle state is a board attribute).