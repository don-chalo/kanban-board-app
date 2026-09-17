import { describe, expect, it } from "vitest";
import { LifecycleState } from "./entities";
import type { Board, Task, User } from "./entities";
import { alice, aliceEmail, makeBoard, makeTask } from "./fixtures";

describe("entities", () => {
  it("constructs a User, Board, and Task", () => {
    const user: User = { id: alice, email: aliceEmail };
    const board: Board = makeBoard();
    const task: Task = makeTask();
    expect(user.id).toBe(alice);
    expect(user.email).toBe(aliceEmail);
    expect(board.creator).toBe(alice);
    expect(board.owner).toBe(alice);
    expect(task.creator).toBe(alice);
    expect(task.owner).toBe(alice);
  });

  it("enumerates the five lifecycle states", () => {
    expect(Object.values(LifecycleState).sort()).toEqual(
      ["ToDo", "InProgress", "Done", "Blocked", "Cancelled"].sort(),
    );
  });

  it("defaults a task to the To Do state with no previous state", () => {
    const task = makeTask();
    expect(task.state).toBe(LifecycleState.ToDo);
    expect(task.previousState).toBeNull();
  });

  it("defaults a board to the To Do state with an empty task list", () => {
    const board = makeBoard();
    expect(board.state).toBe(LifecycleState.ToDo);
    expect(board.previousState).toBeNull();
    expect(board.tasks).toEqual([]);
    expect(board.associated).toEqual([]);
  });
});