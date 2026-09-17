## Context

The project has two freshly scaffolded, disconnected packages: `kanban-api` (Express 5, TypeScript, no source files yet) and `kanban-front-end` (React 19 + Vite, still the default counter demo). OpenSpec is configured but has no specs. See proposal.md - Why for motivation. There is no persistence, no auth, and no shared code between the two packages yet.

## Goals / Non-Goals

**Goals:**
- Define the domain (User, Board, Task), roles, lifecycles, cascade, and authorization as a testable TypeScript domain layer in `kanban-api`.
- Express the state machines and permission rules once, in one place, so API and UI cannot drift.
- Make the domain layer pure and I/O-free so every spec scenario maps to a unit test.

**Non-Goals:**
- Persistence (database or storage choice) — a follow-up change.
- Authentication / sessions / user registration — a follow-up change.
- HTTP endpoints (REST API) — a follow-up change.
- Any UI work — the frontend consumes this later.

## Decisions

### D1: The domain lives in the API package, as pure TypeScript modules
`kanban-api/src/domain/` holds entities, the lifecycle engine, and the authorization policy. The frontend later mirrors DTO types from the API's shapes. The API is the single source of truth; the UI never encodes its own rules.
- *Alternative considered:* a shared types package consumed by both packages — rejected for now: it adds monorepo tooling before either package has real code.
- *Alternative considered:* domain in the frontend — rejected: multi-user (Q2) requires a server-side authority.

### D2: `Blocked` is one state plus a `previousState` field
Board and Task both use a single `Blocked` value; the machine's transition table only allows `Blocked -> previousState`. The `previousState` field is only meaningful while the state is `Blocked`.
- *Alternative considered:* two states `Blocked(from To Do)` / `Blocked(from In Progress)` — rejected: doubles the enum and switches without adding safety beyond what the transition validator already enforces.

### D3: One shared lifecycle engine for Board and Task
A single module owns the transition table:

```
To Do --------> In Progress --------> Done      (Done: terminal)
To Do         -> Blocked(prev=To Do) -> To Do
To Do         -> Cancelled            (terminal)
In Progress   -> Blocked(prev=InProgress) -> In Progress
In Progress   -> Cancelled            (terminal)
```

Board reuses the same engine but adds a **Done-gate precondition** (every task must be `Done` or `Cancelled`) and a **cascade guard** (see D5). No other divergence allowed — `Move to Done` skips, `In Progress -> To Do` backtracking, and `Blocked -> {Done, Cancelled}` are rejected for both.
- *Alternative considered:* two independent machines — rejected: the lifecycle is explicitly "the same" for boards and tasks, so one engine keeps them in lockstep.

### D4: Authorization is a single policy layer
A pure function `authorize(action, board, task, actor)` resolves the actor's role against the board (`creator` | `owner` | `associated` | `none`) and the task's Owner, then returns allow/deny against one policy table. Every mutation path calls it; no scattered role checks in call sites. The policy table mirrors the access-control spec verbatim (see `specs/access-control/spec.md`).

### D5: Read-only is enforced through one guard
`isEditable(board, task)` returns false when the board is `Blocked`/`Cancelled`/`Done` (cascade) or the task is `Done`/`Cancelled` (terminal). Delete, edit, and state moves all pass through it. This is the single enforcement point for the cascade and terminal-state rules.

### D6: Domain commands are the only mutators
Mutations happen through named commands — `createBoard`, `createTask`, `moveTask`, `editTask`, `deleteTask`, `reassignTaskOwner`, `moveBoard`, `manageBoard` — each validating authorization + editability + transition legality. Boards and tasks are plain data objects; all rules live in the command/service layer.

## Risks / Trade-offs

- [Board and Task can drift if each defines its own rules] → D3 shares one engine; any divergence is a deliberate, reviewed deviation.
- [Cascade freeze surprises the UI (sudden read-only)] → D5 concentrates the rule; the API/UI only ever ask `isEditable(board, task)`.
- [`previousState` corruption on a Blocked entity] → transition table writes it only on the Blocked move and clears it on unblock; a stale value is ignored by the validator unless state is `Blocked`.
- [Role resolution duplicates per transaction] → for this scale, resolving roles from the board snapshot on demand is fine; cache later only if profiling shows it matters.

## Migration Plan

Greenfield: no existing data or endpoints to migrate. Domain modules land alongside the empty API package; removal is trivially reversible. Deploy/rollback strategies are N/A until persistence exists.

## Open Questions

- Persistence technology and schema — deferred to the persistence change; the domain commands are intentionally storage-agnostic.
- Authentication/session mechanics — deferred to the auth change; the domain takes an actor identity as input without caring how it was established.