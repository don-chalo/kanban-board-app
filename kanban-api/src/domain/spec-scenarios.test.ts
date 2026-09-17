import { describe, expect, it } from "vitest";
import { LifecycleState } from "./entities";
import {
  createBoard,
  createTask,
  deleteTask,
  editTask,
  manageBoard,
  moveBoard,
  moveTask,
  reassignBoardOwner,
  reassignTaskOwner,
} from "./commands";
import { canView, canViewTask } from "./canview";
import { isEditable } from "./guards";
import { isMember, resolveRole } from "./roles";
import { DomainError } from "./errors";
import { alice, bob, carol } from "./fixtures";

let seq = 0;
const bid = () => `board-${++seq}`;
const tid = () => `task-${++seq}`;

function expectUnauthorized(fn: () => void) {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(DomainError);
  expect((caught as DomainError).code).toBe("unauthorized");
}

function expectReadOnly(fn: () => void) {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(DomainError);
  expect((caught as DomainError).code).toBe("read_only");
}

function sharedBoard() {
  const board = createBoard(alice, { id: bid(), title: "Shared" });
  manageBoard(board, alice, { kind: "addMember", member: bob });
  manageBoard(board, alice, { kind: "addMember", member: carol });
  const johnTask = createTask(board, bob, { id: tid(), title: "John's task" });
  const carolTask = createTask(board, carol, { id: tid(), title: "Carol's task" });
  return { board, johnTask, carolTask };
}

describe("users spec scenarios", () => {
  it("same user referenced consistently", () => {
    const { board } = sharedBoard();
    expect(board.creator).toBe(alice);
    expect(board.owner).toBe(alice);
    expect(board.associated).toContain(bob);
  });

  it("users are distinct", () => {
    expect(alice).not.toBe(bob);
    const { board } = sharedBoard();
    expect(board.creator).not.toBe(bob);
    expect(board.creator).not.toBe(carol);
  });

  it("new board has creator and owner, empty associated set", () => {
    const board = createBoard(alice, { id: bid(), title: "Fresh" });
    expect(board.creator).toBe(alice);
    expect(board.owner).toBe(alice);
    expect(board.associated).toEqual([]);
  });

  it("associated membership does not duplicate the owner", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    expect(() => manageBoard(board, alice, { kind: "addMember", member: alice })).toThrow();
    expect(board.associated).toEqual([]);
    const role = resolveRole(board, alice);
    expect(role).toBe("creator");
    expect(role).not.toBe("associated");
  });

  it("user belongs to several boards", () => {
    const boardA = createBoard(alice, { id: bid(), title: "A" });
    const boardB = createBoard(alice, { id: bid(), title: "B" });
    manageBoard(boardA, alice, { kind: "addMember", member: bob });
    manageBoard(boardB, alice, { kind: "addMember", member: bob });
    expect(isMember(boardA, bob)).toBe(true);
    expect(isMember(boardB, bob)).toBe(true);
  });

  it("user owns tasks across boards", () => {
    const boardA = createBoard(bob, { id: bid(), title: "A" });
    const boardB = createBoard(bob, { id: bid(), title: "B" });
    const taskA = createTask(boardA, bob, { id: tid(), title: "t1" });
    const taskB = createTask(boardB, bob, { id: tid(), title: "t2" });
    expect(taskA.owner).toBe(bob);
    expect(taskB.owner).toBe(bob);
  });
});

describe("boards spec scenarios", () => {
  it("board has a creator and an owner", () => {
    const { board } = sharedBoard();
    expect(board.creator).toBe(alice);
    expect(board.owner).toBe(alice);
  });

  it("board carries a description", () => {
    const board = createBoard(alice, { id: bid(), title: "Docs" });
    expect(board.description).toBe("");
    manageBoard(board, alice, { kind: "editAttributes", description: "Track the docs work" });
    expect(board.description).toBe("Track the docs work");
  });

  it("board ownership is reassigned to a member", () => {
    const { board } = sharedBoard();
    reassignBoardOwner(board, alice, carol);
    expect(board.owner).toBe(carol);
    expect(board.creator).toBe(alice);
  });

  it("reassigned owner leaves the associated set", () => {
    const { board } = sharedBoard();
    reassignBoardOwner(board, alice, carol);
    expect(board.owner).toBe(carol);
    expect(board.associated).not.toContain(carol);
  });

  it("board ownership cannot go to a non-member", () => {
    const { board } = sharedBoard();
    expect(() => reassignBoardOwner(board, alice, "user-outsider")).toThrow(DomainError);
    expect(board.owner).toBe(alice);
  });

  it("board ownership cannot be reassigned while the board is frozen", () => {
    const { board } = sharedBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectReadOnly(() => reassignBoardOwner(board, alice, bob));
    expect(board.owner).toBe(alice);
  });

  it("board contains tasks", () => {
    const { board } = sharedBoard();
    expect(board.tasks).toHaveLength(2);
  });

  it("a task cannot change boards", () => {
    const boardA = createBoard(alice, { id: bid(), title: "A" });
    const boardB = createBoard(alice, { id: bid(), title: "B" });
    const task = createTask(boardA, alice, { id: tid(), title: "t" });
    moveTask(boardA, alice, task.id, LifecycleState.InProgress);
    expect(task.boardId).toBe(boardA.id);
    expect(boardA.tasks).toContain(task);
    expect(boardB.tasks).not.toContain(task);
  });

  it("board progresses to done", () => {
    const { board, johnTask, carolTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    moveTask(board, bob, johnTask.id, LifecycleState.Done);
    moveTask(board, carol, carolTask.id, LifecycleState.Cancelled);
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Done);
    expect(board.state).toBe(LifecycleState.Done);
  });

  it("board returns to its previous state after blocking", () => {
    const { board } = sharedBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expect(board.state).toBe(LifecycleState.Blocked);
    moveBoard(board, alice, LifecycleState.InProgress);
    expect(board.state).toBe(LifecycleState.InProgress);
  });

  it("board is cancelled", () => {
    const { board } = sharedBoard();
    moveBoard(board, alice, LifecycleState.Cancelled);
    expect(board.state).toBe(LifecycleState.Cancelled);
  });

  it("board cannot skip to done", () => {
    const { board } = sharedBoard();
    expect(() => moveBoard(board, alice, LifecycleState.Done)).toThrow(DomainError);
  });

  it("live tasks prevent completion", () => {
    const { board, johnTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.InProgress);
    expect(() => moveBoard(board, alice, LifecycleState.Done)).toThrow(DomainError);
  });

  it("board with finished tasks completes", () => {
    const { board, johnTask, carolTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    moveTask(board, bob, johnTask.id, LifecycleState.Done);
    moveTask(board, carol, carolTask.id, LifecycleState.Cancelled);
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Done);
    expect(board.state).toBe(LifecycleState.Done);
  });

  it("blocked board freezes tasks keeping their state", () => {
    const { board, johnTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expect(johnTask.state).toBe(LifecycleState.InProgress);
    expect(isEditable(board, johnTask)).toBe(false);
  });

  it("unblocking the board restores editability", () => {
    const { board, johnTask } = sharedBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expect(isEditable(board, johnTask)).toBe(false);
    moveBoard(board, alice, LifecycleState.InProgress);
    expect(isEditable(board, johnTask)).toBe(true);
  });

  it("cancelled board freezes tasks permanently", () => {
    const { board, johnTask } = sharedBoard();
    moveBoard(board, alice, LifecycleState.Cancelled);
    expect(isEditable(board, johnTask)).toBe(false);
    expect(() => moveBoard(board, alice, LifecycleState.ToDo)).toThrow(DomainError);
  });

  it("done board freezes tasks", () => {
    const { board, johnTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    moveTask(board, bob, johnTask.id, LifecycleState.Done);
    const carolDone = board.tasks.find((t) => t.id !== johnTask.id)!;
    moveTask(board, carol, carolDone.id, LifecycleState.InProgress);
    moveTask(board, carol, carolDone.id, LifecycleState.Done);
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Done);
    expect(board.state).toBe(LifecycleState.Done);
    expect(isEditable(board, johnTask)).toBe(false);
  });

  it("cancelled board is visible but read-only", () => {
    const { board } = sharedBoard();
    moveBoard(board, alice, LifecycleState.Cancelled);
    expect(canView(board, bob)).toBe(true);
    expect(canViewTask(board, carol)).toBe(true);
    expect(isEditable(board, board.tasks[0])).toBe(false);
  });

  it("frozen board rejects adding a member", () => {
    const board = createBoard(alice, { id: bid(), title: "B" });
    manageBoard(board, alice, { kind: "addMember", member: bob });
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectReadOnly(() => manageBoard(board, alice, { kind: "addMember", member: carol }));
    expect(board.associated).not.toContain(carol);
  });

  it("terminal boards reject adding a member", () => {
    for (const state of [LifecycleState.Done, LifecycleState.Cancelled]) {
      const board = createBoard(alice, { id: bid(), title: "B" });
      const task = createTask(board, alice, { id: tid(), title: "t" });
      moveTask(board, alice, task.id, LifecycleState.InProgress);
      moveTask(board, alice, task.id, state === LifecycleState.Done ? LifecycleState.Done : LifecycleState.Cancelled);
      moveBoard(board, alice, LifecycleState.InProgress);
      moveBoard(board, alice, state);
      expectReadOnly(() => manageBoard(board, alice, { kind: "addMember", member: bob }));
    }
  });

  it("frozen board rejects title edit but allows description edit", () => {
    const board = createBoard(alice, { id: bid(), title: "B" });
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectReadOnly(() => manageBoard(board, alice, { kind: "editAttributes", title: "X" }));
    expect(board.title).toBe("B");
    manageBoard(board, alice, { kind: "editAttributes", description: "notes" });
    expect(board.description).toBe("notes");
  });

  it("terminal boards reject title edit but allow description edit", () => {
    for (const state of [LifecycleState.Done, LifecycleState.Cancelled]) {
      const board = createBoard(alice, { id: bid(), title: "B" });
      const task = createTask(board, alice, { id: tid(), title: "t" });
      moveTask(board, alice, task.id, LifecycleState.InProgress);
      moveTask(board, alice, task.id, state === LifecycleState.Done ? LifecycleState.Done : LifecycleState.Cancelled);
      moveBoard(board, alice, LifecycleState.InProgress);
      moveBoard(board, alice, state);
      expectReadOnly(() => manageBoard(board, alice, { kind: "editAttributes", title: "X" }));
      manageBoard(board, alice, { kind: "editAttributes", description: `desc-${state}` });
      expect(board.description).toBe(`desc-${state}`);
    }
  });

  it("mixed title and description edit on frozen board is atomic", () => {
    const board = createBoard(alice, { id: bid(), title: "B" });
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectReadOnly(() => manageBoard(board, alice, { kind: "editAttributes", title: "X", description: "Y" }));
    expect(board.title).toBe("B");
    expect(board.description).toBe("");
  });
});

describe("tasks spec scenarios", () => {
  it("task is created with the creator as owner", () => {
    const { johnTask } = sharedBoard();
    expect(johnTask.creator).toBe(bob);
    expect(johnTask.owner).toBe(bob);
  });

  it("task belongs to exactly one board", () => {
    const boardA = createBoard(alice, { id: bid(), title: "A" });
    const task = createTask(boardA, alice, { id: tid(), title: "t" });
    expect(task.boardId).toBe(boardA.id);
  });

  it("board owner reassigns a task owner", () => {
    const { board, johnTask } = sharedBoard();
    reassignTaskOwner(board, alice, johnTask.id, carol);
    expect(johnTask.owner).toBe(carol);
  });

  it("task owner must be a board member", () => {
    const { board, johnTask } = sharedBoard();
    expect(() =>
      reassignTaskOwner(board, alice, johnTask.id, "user-outsider"),
    ).toThrow(DomainError);
  });

  it("task progresses to done", () => {
    const { board, johnTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    moveTask(board, bob, johnTask.id, LifecycleState.Done);
    expect(johnTask.state).toBe(LifecycleState.Done);
  });

  it("blocking a To Do task is rejected", () => {
    const { board, johnTask } = sharedBoard();
    expect(() => moveTask(board, bob, johnTask.id, LifecycleState.Blocked)).toThrow(DomainError);
    expect(johnTask.state).toBe(LifecycleState.ToDo);
  });

  it("blocked task from In Progress returns to In Progress", () => {
    const { board, johnTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    moveTask(board, bob, johnTask.id, LifecycleState.Blocked);
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    expect(johnTask.state).toBe(LifecycleState.InProgress);
  });

  it("backtracking and cross transitions are rejected", () => {
    const { board, johnTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    expect(() => moveTask(board, bob, johnTask.id, LifecycleState.ToDo)).toThrow(DomainError);
    moveTask(board, bob, johnTask.id, LifecycleState.Blocked);
    expect(() => moveTask(board, bob, johnTask.id, LifecycleState.Done)).toThrow(DomainError);
    expect(() => moveTask(board, bob, johnTask.id, LifecycleState.Cancelled)).toThrow(DomainError);
  });

  it("cancelled task is terminal and read-only", () => {
    const { board, johnTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.Cancelled);
    expect(() => moveTask(board, bob, johnTask.id, LifecycleState.Blocked)).toThrow(DomainError);
    expectReadOnly(() => editTask(board, alice, johnTask.id, { title: "x" }));
  });

  it("done task is terminal and read-only", () => {
    const { board, johnTask } = sharedBoard();
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    moveTask(board, bob, johnTask.id, LifecycleState.Done);
    expect(() => moveTask(board, bob, johnTask.id, LifecycleState.InProgress)).toThrow(DomainError);
    expectReadOnly(() => editTask(board, alice, johnTask.id, { title: "x" }));
  });
});

describe("access-control spec scenarios", () => {
  it("associated member sees all tasks", () => {
    const { board, carolTask } = sharedBoard();
    expect(canView(board, bob)).toBe(true);
    expect(canViewTask(board, carol)).toBe(true);
    const other = board.tasks.find((t) => t.id !== carolTask.id)!;
    expect(other.owner).not.toBe(carol);
  });

  it("non-member has no access", () => {
    const { board } = sharedBoard();
    expect(canView(board, "user-outsider")).toBe(false);
    expect(canViewTask(board, "user-outsider")).toBe(false);
    expect(() => createTask(board, "user-outsider", { id: tid(), title: "x" })).toThrow(DomainError);
  });

  it("associated member creates a task", () => {
    const { board } = sharedBoard();
    const task = createTask(board, bob, { id: tid(), title: "New" });
    expect(task.creator).toBe(bob);
    expect(task.owner).toBe(bob);
  });

  it("frozen board rejects task creation", () => {
    const { board } = sharedBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    const count = board.tasks.length;
    expectReadOnly(() => createTask(board, alice, { id: tid(), title: "Frozen" }));
    expect(board.tasks).toHaveLength(count);
  });

  it("task owner edits and moves their own task", () => {
    const { board, johnTask } = sharedBoard();
    editTask(board, bob, johnTask.id, { title: "Edited" });
    moveTask(board, bob, johnTask.id, LifecycleState.InProgress);
    expect(johnTask.title).toBe("Edited");
    expect(johnTask.state).toBe(LifecycleState.InProgress);
  });

  it("associated member cannot edit another member's task", () => {
    const { board, johnTask } = sharedBoard();
    expectUnauthorized(() => editTask(board, carol, johnTask.id, { title: "x" }));
  });

  it("board owner edits any task", () => {
    const { board, johnTask } = sharedBoard();
    editTask(board, alice, johnTask.id, { title: "By owner" });
    expect(johnTask.title).toBe("By owner");
  });

  it("board owner deletes a task", () => {
    const { board, johnTask } = sharedBoard();
    deleteTask(board, alice, johnTask.id);
    expect(board.tasks).not.toContain(johnTask);
  });

  it("associated member cannot delete", () => {
    const { board, johnTask } = sharedBoard();
    expectUnauthorized(() => deleteTask(board, bob, johnTask.id));
  });

  it("task owner cannot delete", () => {
    const { board, johnTask } = sharedBoard();
    expectUnauthorized(() => deleteTask(board, bob, johnTask.id));
    expect(board.tasks).toContain(johnTask);
  });

  it("deleted task is gone", () => {
    const { board, johnTask } = sharedBoard();
    deleteTask(board, alice, johnTask.id);
    expect(board.tasks.find((t) => t.id === johnTask.id)).toBeUndefined();
  });

  it("board owner reassigns a task", () => {
    const { board, johnTask } = sharedBoard();
    reassignTaskOwner(board, alice, johnTask.id, carol);
    expect(johnTask.owner).toBe(carol);
  });

  it("associated member cannot reassign", () => {
    const { board, johnTask } = sharedBoard();
    expectUnauthorized(() => reassignTaskOwner(board, carol, johnTask.id, bob));
  });

  it("board owner manages members", () => {
    const board = createBoard(alice, { id: bid(), title: "B" });
    manageBoard(board, alice, { kind: "addMember", member: bob });
    expect(board.associated).toContain(bob);
    manageBoard(board, alice, { kind: "removeMember", member: bob });
    expect(board.associated).not.toContain(bob);
  });

  it("board owner changes board state", () => {
    const board = createBoard(alice, { id: bid(), title: "B" });
    manageBoard(board, alice, { kind: "changeState", target: LifecycleState.InProgress });
    expect(board.state).toBe(LifecycleState.InProgress);
  });

  it("associated member cannot manage the board", () => {
    const { board } = sharedBoard();
    expectUnauthorized(() => manageBoard(board, bob, { kind: "addMember", member: carol }));
    expectUnauthorized(() => manageBoard(board, bob, { kind: "removeMember", member: carol }));
    expectUnauthorized(() => manageBoard(board, bob, { kind: "editAttributes", title: "x" }));
    expectUnauthorized(() =>
      manageBoard(board, bob, { kind: "changeState", target: LifecycleState.InProgress }),
    );
    expectUnauthorized(() => reassignBoardOwner(board, bob, carol));
  });

  it("board owner reassigns the board", () => {
    const { board } = sharedBoard();
    reassignBoardOwner(board, alice, carol);
    expect(board.owner).toBe(carol);
  });

  it("associated member cannot reassign the board", () => {
    const { board } = sharedBoard();
    expectUnauthorized(() => reassignBoardOwner(board, carol, bob));
    expect(board.owner).toBe(alice);
  });
});