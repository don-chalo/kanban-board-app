import { LifecycleState } from "./entities";
import type { Board, Task } from "./entities";

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export const alice = "user-alice";
export const bob = "user-bob";
export const carol = "user-carol";

export const aliceEmail = "alice@example.com";

export function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: nextId("board"),
    title: "Board",
    description: "",
    creator: alice,
    owner: alice,
    associated: [],
    state: LifecycleState.ToDo,
    previousState: null,
    tasks: [],
    comments: [],
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: nextId("task"),
    boardId: "board-1",
    creator: alice,
    owner: alice,
    title: "Task",
    description: "",
    state: LifecycleState.ToDo,
    previousState: null,
    priority: "medium",
    startedAt: null,
    storyPoints: null,
    comments: [],
    ...overrides,
  };
}