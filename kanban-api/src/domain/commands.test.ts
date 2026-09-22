import { describe, expect, it } from "vitest";
import { LifecycleState } from "./entities";
import {
  addComment,
  addTaskComment,
  createBoard,
  createTask,
  deleteTask,
  editComment,
  editTask,
  editTaskComment,
  manageBoard,
  moveBoard,
  moveTask,
  reassignBoardOwner,
  reassignTaskOwner,
  removeComment,
  removeTaskComment,
} from "./commands";
import { DomainError } from "./errors";
import type { DomainErrorCode } from "./errors";
import { alice, bob, carol } from "./fixtures";

let seq = 0;
const bid = () => `board-${++seq}`;
const tid = () => `task-${++seq}`;
const cid = () => `comment-${++seq}`;

function expectDomainError(fn: () => void, code: DomainErrorCode) {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(DomainError);
  expect((caught as DomainError).code).toBe(code);
}

function makeTestBoard() {
  const board = createBoard(alice, { id: bid(), title: "Test Board" });
  manageBoard(board, alice, { kind: "addMember", member: bob });
  manageBoard(board, alice, { kind: "addMember", member: carol });
  createTask(board, alice, { id: tid(), title: "Alice task" });
  createTask(board, carol, { id: tid(), title: "Carol task" });
  return board;
}

function makeStartedBoard() {
  const board = makeTestBoard();
  moveBoard(board, alice, LifecycleState.InProgress);
  return board;
}

function taskById(board: ReturnType<typeof makeTestBoard>, index: number) {
  return board.tasks[index];
}

describe("createBoard", () => {
  it("sets the creator as owner with an empty associated set and To Do state", () => {
    const board = createBoard(alice, { id: bid(), title: "New Board" });
    expect(board.creator).toBe(alice);
    expect(board.owner).toBe(alice);
    expect(board.associated).toEqual([]);
    expect(board.state).toBe(LifecycleState.ToDo);
    expect(board.previousState).toBeNull();
    expect(board.tasks).toEqual([]);
    expect(board.comments).toEqual([]);
  });
});

describe("createTask", () => {
  it("defaults the owner to the creator and the state to To Do", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    const task = createTask(board, alice, { id: tid(), title: "Task" });
    expect(task.creator).toBe(alice);
    expect(task.owner).toBe(alice);
    expect(task.state).toBe(LifecycleState.ToDo);
    expect(task.previousState).toBeNull();
  });

  it("attaches the task to exactly its board", () => {
    const boardA = createBoard(alice, { id: bid(), title: "A" });
    const boardB = createBoard(alice, { id: bid(), title: "B" });
    const task = createTask(boardA, alice, { id: tid(), title: "Task" });
    expect(task.boardId).toBe(boardA.id);
    expect(boardA.tasks).toContain(task);
    expect(boardB.tasks).not.toContain(task);
  });

  it("lets an Associated member create a task", () => {
    const board = makeTestBoard();
    const task = createTask(board, carol, { id: tid(), title: "Carol new" });
    expect(task.creator).toBe(carol);
    expect(task.owner).toBe(carol);
  });

  it("rejects a non-member", () => {
    const board = makeTestBoard();
    expectDomainError(
      () => createTask(board, "user-outsider", { id: tid(), title: "Task" }),
      "unauthorized",
    );
  });

  it("rejects creation on a Cancelled or Done board", () => {
    const cancelled = makeTestBoard();
    moveBoard(cancelled, alice, LifecycleState.Cancelled);
    expectDomainError(
      () => createTask(cancelled, alice, { id: tid(), title: "Task" }),
      "read_only",
    );
  });

  it("rejects creation on a Blocked board", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectDomainError(
      () => createTask(board, alice, { id: tid(), title: "Task" }),
      "read_only",
    );
    expect(board.tasks).toHaveLength(2);
  });
});

describe("moveTask", () => {
  it("moves a task through the happy path to Done", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    const task = taskById(board, 0);
    moveTask(board, alice, task.id, LifecycleState.InProgress);
    expect(task.state).toBe(LifecycleState.InProgress);
    moveTask(board, alice, task.id, LifecycleState.Done);
    expect(task.state).toBe(LifecycleState.Done);
  });

  it("rejects moves while the board is not In Progress", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    expectDomainError(
      () => moveTask(board, alice, task.id, LifecycleState.InProgress),
      "board_not_in_progress",
    );
    expect(task.state).toBe(LifecycleState.ToDo);
  });

  it("rejects blocking a To Do task", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    const task = taskById(board, 0);
    expectDomainError(
      () => moveTask(board, alice, task.id, LifecycleState.Blocked),
      "invalid_transition",
    );
  });

  it("blocks and unblocks an In Progress task back to In Progress", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    const task = taskById(board, 0);
    moveTask(board, alice, task.id, LifecycleState.InProgress);
    moveTask(board, alice, task.id, LifecycleState.Blocked);
    expect(task.previousState).toBe(LifecycleState.InProgress);
    moveTask(board, alice, task.id, LifecycleState.InProgress);
    expect(task.state).toBe(LifecycleState.InProgress);
  });

  it("repels backtracking and cross transitions", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    const task = taskById(board, 0);
    moveTask(board, alice, task.id, LifecycleState.InProgress);
    expectDomainError(
      () => moveTask(board, alice, task.id, LifecycleState.ToDo),
      "invalid_transition",
    );
    moveTask(board, alice, task.id, LifecycleState.Blocked);
    expectDomainError(
      () => moveTask(board, alice, task.id, LifecycleState.Done),
      "invalid_transition",
    );
    expectDomainError(
      () => moveTask(board, alice, task.id, LifecycleState.Cancelled),
      "invalid_transition",
    );
  });

  it("refuses to move a terminal task", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    const task = taskById(board, 0);
    moveTask(board, alice, task.id, LifecycleState.Cancelled);
    expectDomainError(
      () => moveTask(board, alice, task.id, LifecycleState.Blocked),
      "read_only",
    );
  });

  it("refuses to move a task on a frozen board", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectDomainError(
      () => moveTask(board, alice, task.id, LifecycleState.InProgress),
      "read_only",
    );
  });

  it("lets an Associated owner move only their own task", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    const carolTask = taskById(board, 1);
    const aliceTask = taskById(board, 0);
    moveTask(board, carol, carolTask.id, LifecycleState.InProgress);
    expect(carolTask.state).toBe(LifecycleState.InProgress);
    expectDomainError(
      () => moveTask(board, carol, aliceTask.id, LifecycleState.InProgress),
      "unauthorized",
    );
  });
});

describe("moveBoard", () => {
  it("moves the board through the happy path to Done", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    let task = taskById(board, 0);
    moveTask(board, alice, task.id, LifecycleState.InProgress);
    moveTask(board, alice, task.id, LifecycleState.Done);
    task = taskById(board, 1);
    moveTask(board, alice, task.id, LifecycleState.Cancelled);
    moveBoard(board, alice, LifecycleState.Done);
    expect(board.state).toBe(LifecycleState.Done);
  });

  it("blocks and unblocks the board to its previous state", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expect(board.state).toBe(LifecycleState.Blocked);
    expect(board.previousState).toBe(LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.InProgress);
    expect(board.state).toBe(LifecycleState.InProgress);
    expect(board.previousState).toBeNull();
  });

  it("cancels the board", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.Cancelled);
    expect(board.state).toBe(LifecycleState.Cancelled);
  });

  it("prevents skipping directly to Done", () => {
    const board = makeTestBoard();
    expectDomainError(
      () => moveBoard(board, alice, LifecycleState.Done),
      "board_not_done",
    );
  });

  it("enforces the Done gate", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    expectDomainError(
      () => moveBoard(board, alice, LifecycleState.Done),
      "board_not_done",
    );
  });

  it("only lets the Board Creator/Owner move the board", () => {
    const board = makeTestBoard();
    expectDomainError(
      () => moveBoard(board, carol, LifecycleState.InProgress),
      "unauthorized",
    );
  });
});

describe("editTask", () => {
  it("lets the Task Owner edit their own task", () => {
    const board = makeTestBoard();
    const task = taskById(board, 1);
    editTask(board, carol, task.id, { title: "Renamed", description: "Notes" });
    expect(task.title).toBe("Renamed");
    expect(task.description).toBe("Notes");
  });

  it("lets the Board Owner edit any task", () => {
    const board = makeTestBoard();
    const task = taskById(board, 1);
    editTask(board, alice, task.id, { title: "By owner" });
    expect(task.title).toBe("By owner");
  });

  it("rejects an Associated member editing another member's task", () => {
    const board = makeTestBoard();
    const aliceTask = taskById(board, 0);
    expectDomainError(
      () => editTask(board, carol, aliceTask.id, { title: "Hacked" }),
      "unauthorized",
    );
  });

  it("rejects editing a terminal task", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    const task = taskById(board, 0);
    moveTask(board, alice, task.id, LifecycleState.InProgress);
    moveTask(board, alice, task.id, LifecycleState.Done);
    expectDomainError(
      () => editTask(board, alice, task.id, { title: "Late" }),
      "read_only",
    );
  });

  it("rejects editing on a frozen board", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    const task = taskById(board, 0);
    expectDomainError(
      () => editTask(board, alice, task.id, { title: "Late" }),
      "read_only",
    );
  });
});

describe("reassignTaskOwner", () => {
  it("lets the Board Owner reassign a task to a member", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    reassignTaskOwner(board, alice, task.id, bob);
    expect(task.owner).toBe(bob);
  });

  it("lets the Board Creator reassign a task", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    reassignTaskOwner(board, alice, task.id, carol);
    expect(task.owner).toBe(carol);
  });

  it("rejects a target who is not a board member", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    expectDomainError(
      () => reassignTaskOwner(board, alice, task.id, "user-outsider"),
      "member_required",
    );
  });

  it("rejects Associated and task-owner actors", () => {
    const board = makeTestBoard();
    const task = taskById(board, 1);
    expectDomainError(
      () => reassignTaskOwner(board, carol, task.id, bob),
      "unauthorized",
    );
  });

  it("rejects reassignment on a frozen board", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    const task = taskById(board, 0);
    expectDomainError(
      () => reassignTaskOwner(board, alice, task.id, bob),
      "read_only",
    );
  });
});

describe("reassignBoardOwner", () => {
  it("lets the Board Owner transfer ownership to a member", () => {
    const board = makeTestBoard();
    reassignBoardOwner(board, alice, bob);
    expect(board.owner).toBe(bob);
  });

  it("lets the Board Creator transfer ownership", () => {
    const board = makeTestBoard();
    reassignBoardOwner(board, alice, carol);
    expect(board.owner).toBe(carol);
  });

  it("removes an Associated target from the Associated set", () => {
    const board = makeTestBoard();
    reassignBoardOwner(board, alice, carol);
    expect(board.owner).toBe(carol);
    expect(board.associated).not.toContain(carol);
    expect(board.associated).toContain(bob);
  });

  it("rejects a target who is not a board member", () => {
    const board = makeTestBoard();
    expectDomainError(
      () => reassignBoardOwner(board, alice, "user-outsider"),
      "member_required",
    );
  });

  it("never changes the Creator", () => {
    const board = makeTestBoard();
    reassignBoardOwner(board, alice, bob);
    expect(board.creator).toBe(alice);
  });

  it("rejects Associated actors", () => {
    const board = makeTestBoard();
    expectDomainError(() => reassignBoardOwner(board, carol, bob), "unauthorized");
  });

  it("rejects transfers on a frozen board", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectDomainError(() => reassignBoardOwner(board, alice, bob), "read_only");
  });
});

describe("deleteTask", () => {
  it("lets the Board Owner delete a task permanently", () => {    const board = makeTestBoard();
    const task = taskById(board, 0);
    deleteTask(board, alice, task.id);
    expect(board.tasks).not.toContain(task);
    expect(board.tasks).toHaveLength(1);
  });

  it("rejects an Associated member", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    expectDomainError(() => deleteTask(board, carol, task.id), "unauthorized");
    expect(board.tasks).toHaveLength(2);
  });

  it("rejects the Task Owner who is only an Associated member", () => {
    const board = makeTestBoard();
    const carolTask = taskById(board, 1);
    expectDomainError(() => deleteTask(board, carol, carolTask.id), "unauthorized");
  });

  it("rejects deletion on a frozen board", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    const task = taskById(board, 0);
    expectDomainError(() => deleteTask(board, alice, task.id), "read_only");
  });
});

describe("board comments", () => {
  it("lets any member add a comment stamping author and time", () => {
    const board = makeTestBoard();
    const comment = addComment(board, bob, { id: cid(), text: "Looks good" }, "2026-09-21T10:00:00.000Z");
    expect(comment).toEqual({
      id: comment.id,
      author: bob,
      text: "Looks good",
      createdAt: "2026-09-21T10:00:00.000Z",
    });
    expect(board.comments).toContain(comment);
  });

  it("rejects comments from non-members", () => {
    const board = makeTestBoard();
    expectDomainError(
      () => addComment(board, "user-outsider", { id: cid(), text: "Hi" }),
      "unauthorized",
    );
    expect(board.comments).toHaveLength(0);
  });

  it("rejects blank and overlong text", () => {
    const board = makeTestBoard();
    expectDomainError(() => addComment(board, bob, { id: cid(), text: "   " }), "validation");
    expectDomainError(
      () => addComment(board, bob, { id: cid(), text: "x".repeat(2001) }),
      "validation",
    );
    expect(board.comments).toHaveLength(0);
  });

  it("lets the author edit their comment", () => {
    const board = makeTestBoard();
    const comment = addComment(board, bob, { id: cid(), text: "Draft" });
    const updated = editComment(board, bob, comment.id, "Final");
    expect(updated.text).toBe("Final");
    expect(board.comments[0].text).toBe("Final");
  });

  it("lets a manager edit another member's comment", () => {
    const board = makeTestBoard();
    const comment = addComment(board, bob, { id: cid(), text: "Draft" });
    editComment(board, alice, comment.id, "Edited by manager");
    expect(board.comments[0].text).toBe("Edited by manager");
  });

  it("rejects edits from non-authors without a manager role", () => {
    const board = makeTestBoard();
    const comment = addComment(board, bob, { id: cid(), text: "Draft" });
    expectDomainError(() => editComment(board, carol, comment.id, "Hijack"), "unauthorized");
    expect(board.comments[0].text).toBe("Draft");
  });

  it("rejects edits with invalid text", () => {
    const board = makeTestBoard();
    const comment = addComment(board, bob, { id: cid(), text: "Draft" });
    expectDomainError(() => editComment(board, bob, comment.id, "  "), "validation");
    expect(board.comments[0].text).toBe("Draft");
  });

  it("lets the author and managers remove comments", () => {
    const board = makeTestBoard();
    const own = addComment(board, bob, { id: cid(), text: "Mine" });
    removeComment(board, bob, own.id);
    expect(board.comments).toHaveLength(0);

    const other = addComment(board, bob, { id: cid(), text: "Theirs" });
    removeComment(board, alice, other.id);
    expect(board.comments).toHaveLength(0);
  });

  it("rejects removal from non-authors without a manager role", () => {
    const board = makeTestBoard();
    const comment = addComment(board, bob, { id: cid(), text: "Mine" });
    expectDomainError(() => removeComment(board, carol, comment.id), "unauthorized");
    expect(board.comments).toHaveLength(1);
  });

  it("rejects edits and removals of missing comments", () => {
    const board = makeTestBoard();
    expectDomainError(() => editComment(board, alice, "comment-ghost", "x"), "not_found");
    expectDomainError(() => removeComment(board, alice, "comment-ghost"), "not_found");
  });

  it("allows full CRUD on a frozen board", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    const comment = addComment(board, bob, { id: cid(), text: "Frozen note" });
    editComment(board, bob, comment.id, "Edited frozen");
    expect(board.comments[0].text).toBe("Edited frozen");
    removeComment(board, alice, comment.id);
    expect(board.comments).toHaveLength(0);
  });
});

describe("task comments", () => {
  it("lets any member add a comment stamping author and time", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    const comment = addTaskComment(
      board,
      bob,
      task.id,
      { id: cid(), text: "On it" },
      "2026-09-21T10:00:00.000Z",
    );
    expect(comment).toEqual({
      id: comment.id,
      author: bob,
      text: "On it",
      createdAt: "2026-09-21T10:00:00.000Z",
    });
    expect(task.comments).toContain(comment);
  });

  it("rejects comments from non-members and on missing tasks", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    expectDomainError(
      () => addTaskComment(board, "user-outsider", task.id, { id: cid(), text: "Hi" }),
      "unauthorized",
    );
    expectDomainError(
      () => addTaskComment(board, bob, "task-ghost", { id: cid(), text: "Hi" }),
      "not_found",
    );
    expect(task.comments).toHaveLength(0);
  });

  it("rejects blank and overlong text", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    expectDomainError(
      () => addTaskComment(board, bob, task.id, { id: cid(), text: "   " }),
      "validation",
    );
    expectDomainError(
      () => addTaskComment(board, bob, task.id, { id: cid(), text: "x".repeat(2001) }),
      "validation",
    );
    expect(task.comments).toHaveLength(0);
  });

  it("lets the author edit their comment", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    const comment = addTaskComment(board, bob, task.id, { id: cid(), text: "Draft" });
    editTaskComment(board, bob, task.id, comment.id, "Final");
    expect(task.comments[0].text).toBe("Final");
  });

  it("lets a board manager edit another member's comment", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    const comment = addTaskComment(board, bob, task.id, { id: cid(), text: "Draft" });
    editTaskComment(board, alice, task.id, comment.id, "Edited by manager");
    expect(task.comments[0].text).toBe("Edited by manager");
  });

  it("lets the task owner edit another member's comment on their task", () => {
    const board = makeTestBoard();
    const carolTask = taskById(board, 1);
    const comment = addTaskComment(board, bob, carolTask.id, { id: cid(), text: "Draft" });
    editTaskComment(board, carol, carolTask.id, comment.id, "Edited by owner");
    expect(carolTask.comments[0].text).toBe("Edited by owner");
  });

  it("rejects edits from members with no power over the thread", () => {
    const board = makeTestBoard();
    const aliceTask = taskById(board, 0);
    const comment = addTaskComment(board, bob, aliceTask.id, { id: cid(), text: "Draft" });
    expectDomainError(
      () => editTaskComment(board, carol, aliceTask.id, comment.id, "Hijack"),
      "unauthorized",
    );
    expect(aliceTask.comments[0].text).toBe("Draft");
  });

  it("lets the author, managers, and the task owner remove comments", () => {
    const board = makeTestBoard();
    const aliceTask = taskById(board, 0);
    const carolTask = taskById(board, 1);

    const own = addTaskComment(board, bob, aliceTask.id, { id: cid(), text: "Mine" });
    removeTaskComment(board, bob, aliceTask.id, own.id);
    expect(aliceTask.comments).toHaveLength(0);

    const managed = addTaskComment(board, bob, aliceTask.id, { id: cid(), text: "Theirs" });
    removeTaskComment(board, alice, aliceTask.id, managed.id);
    expect(aliceTask.comments).toHaveLength(0);

    const owned = addTaskComment(board, bob, carolTask.id, { id: cid(), text: "On my task" });
    removeTaskComment(board, carol, carolTask.id, owned.id);
    expect(carolTask.comments).toHaveLength(0);
  });

  it("rejects removal from members with no power over the thread", () => {
    const board = makeTestBoard();
    const aliceTask = taskById(board, 0);
    const comment = addTaskComment(board, bob, aliceTask.id, { id: cid(), text: "Mine" });
    expectDomainError(
      () => removeTaskComment(board, carol, aliceTask.id, comment.id),
      "unauthorized",
    );
    expect(aliceTask.comments).toHaveLength(1);
  });

  it("rejects edits and removals of missing tasks or comments", () => {
    const board = makeTestBoard();
    const task = taskById(board, 0);
    expectDomainError(
      () => editTaskComment(board, alice, "task-ghost", "comment-ghost", "x"),
      "not_found",
    );
    expectDomainError(
      () => editTaskComment(board, alice, task.id, "comment-ghost", "x"),
      "not_found",
    );
    expectDomainError(
      () => removeTaskComment(board, alice, task.id, "comment-ghost"),
      "not_found",
    );
  });

  it("allows full CRUD on a frozen board and a terminal task", () => {
    const board = makeTestBoard();
    moveBoard(board, alice, LifecycleState.InProgress);
    const task = taskById(board, 0);
    moveTask(board, alice, task.id, LifecycleState.InProgress);
    moveTask(board, alice, task.id, LifecycleState.Done);
    moveBoard(board, alice, LifecycleState.Blocked);
    const comment = addTaskComment(board, bob, task.id, { id: cid(), text: "Frozen note" });
    editTaskComment(board, bob, task.id, comment.id, "Edited frozen");
    expect(task.comments[0].text).toBe("Edited frozen");
    removeTaskComment(board, alice, task.id, comment.id);
    expect(task.comments).toHaveLength(0);
  });
});

describe("manageBoard", () => {
  it("lets the Board Owner add and remove Associated members", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    manageBoard(board, alice, { kind: "addMember", member: bob });
    expect(board.associated).toContain(bob);
    manageBoard(board, alice, { kind: "removeMember", member: bob });
    expect(board.associated).not.toContain(bob);
  });

  it("never adds the creator or owner to the Associated set", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    expectDomainError(
      () => manageBoard(board, alice, { kind: "addMember", member: alice }),
      "cannot_modify_creator",
    );
  });

  it("rejects duplicate members", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    manageBoard(board, alice, { kind: "addMember", member: bob });
    expectDomainError(
      () => manageBoard(board, alice, { kind: "addMember", member: bob }),
      "duplicate_member",
    );
  });

  it("rejects removing a user who is not an Associated member", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    expectDomainError(
      () => manageBoard(board, alice, { kind: "removeMember", member: bob }),
      "not_associated",
    );
  });

  it("rejects removing an Associated member on a frozen board", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    manageBoard(board, alice, { kind: "addMember", member: bob });
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectDomainError(
      () => manageBoard(board, alice, { kind: "removeMember", member: bob }),
      "read_only",
    );
    expect(board.associated).toContain(bob);
  });

  it("rejects removing an Associated member on terminal boards", () => {
    for (const state of [LifecycleState.Done, LifecycleState.Cancelled]) {
      const board = createBoard(alice, { id: bid(), title: "Board" });
      manageBoard(board, alice, { kind: "addMember", member: bob });
      const task = createTask(board, bob, { id: tid(), title: "Task" });
      moveBoard(board, alice, LifecycleState.InProgress);
      moveTask(board, bob, task.id, LifecycleState.InProgress);
      moveTask(board, bob, task.id, state === LifecycleState.Done ? LifecycleState.Done : LifecycleState.Cancelled);
      moveBoard(board, alice, state);
      expectDomainError(
        () => manageBoard(board, alice, { kind: "removeMember", member: bob }),
        "read_only",
      );
    }
  });

  it("rejects adding an Associated member on a frozen board", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectDomainError(
      () => manageBoard(board, alice, { kind: "addMember", member: bob }),
      "read_only",
    );
    expect(board.associated).not.toContain(bob);
  });

  it("rejects adding an Associated member on terminal boards", () => {
    for (const state of [LifecycleState.Done, LifecycleState.Cancelled]) {
      const board = createBoard(alice, { id: bid(), title: "Board" });
      const task = createTask(board, alice, { id: tid(), title: "t" });
      moveBoard(board, alice, LifecycleState.InProgress);
      moveTask(board, alice, task.id, LifecycleState.InProgress);
      moveTask(board, alice, task.id, state === LifecycleState.Done ? LifecycleState.Done : LifecycleState.Cancelled);
      moveBoard(board, alice, state);
      expectDomainError(
        () => manageBoard(board, alice, { kind: "addMember", member: bob }),
        "read_only",
      );
      expect(board.associated).not.toContain(bob);
    }
  });

  it("lets the Board Owner edit board attributes", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    manageBoard(board, alice, { kind: "editAttributes", title: "Renamed" });
    expect(board.title).toBe("Renamed");
  });

  it("lets the Board Owner edit the description", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    expect(board.description).toBe("");
    manageBoard(board, alice, { kind: "editAttributes", description: "Notes" });
    expect(board.description).toBe("Notes");
  });

  it("rejects editing the board title on a frozen board", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectDomainError(
      () => manageBoard(board, alice, { kind: "editAttributes", title: "Frozen Title" }),
      "read_only",
    );
    expect(board.title).toBe("Board");
  });

  it("rejects editing the board title on terminal boards", () => {
    for (const state of [LifecycleState.Done, LifecycleState.Cancelled]) {
      const board = createBoard(alice, { id: bid(), title: "Board" });
      const task = createTask(board, alice, { id: tid(), title: "t" });
      moveBoard(board, alice, LifecycleState.InProgress);
      moveTask(board, alice, task.id, LifecycleState.InProgress);
      moveTask(board, alice, task.id, state === LifecycleState.Done ? LifecycleState.Done : LifecycleState.Cancelled);
      moveBoard(board, alice, state);
      expectDomainError(
        () => manageBoard(board, alice, { kind: "editAttributes", title: "X" }),
        "read_only",
      );
      expect(board.title).toBe("Board");
    }
  });

  it("allows editing the board description on a frozen board", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    manageBoard(board, alice, { kind: "editAttributes", description: "Frozen notes" });
    expect(board.description).toBe("Frozen notes");
  });

  it("allows editing the board description on terminal boards", () => {
    for (const state of [LifecycleState.Done, LifecycleState.Cancelled]) {
      const board = createBoard(alice, { id: bid(), title: "Board" });
      const task = createTask(board, alice, { id: tid(), title: "t" });
      moveBoard(board, alice, LifecycleState.InProgress);
      moveTask(board, alice, task.id, LifecycleState.InProgress);
      moveTask(board, alice, task.id, state === LifecycleState.Done ? LifecycleState.Done : LifecycleState.Cancelled);
      moveBoard(board, alice, state);
      manageBoard(board, alice, { kind: "editAttributes", description: "Notes" });
      expect(board.description).toBe("Notes");
    }
  });

  it("rejects mixed title and description edits atomically on a frozen board", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    moveBoard(board, alice, LifecycleState.InProgress);
    moveBoard(board, alice, LifecycleState.Blocked);
    expectDomainError(
      () => manageBoard(board, alice, { kind: "editAttributes", title: "X", description: "Y" }),
      "read_only",
    );
    expect(board.title).toBe("Board");
    expect(board.description).toBe("");
  });

  it("lets the Board Owner change board state", () => {
    const board = createBoard(alice, { id: bid(), title: "Board" });
    manageBoard(board, alice, { kind: "changeState", target: LifecycleState.InProgress });
    expect(board.state).toBe(LifecycleState.InProgress);
  });

  it("rejects everyone except the Creator/Owner", () => {
    const board = makeTestBoard();
    expectDomainError(
      () => manageBoard(board, carol, { kind: "editAttributes", title: "X" }),
      "unauthorized",
    );
    expectDomainError(
      () => manageBoard(board, carol, { kind: "addMember", member: bob }),
      "unauthorized",
    );
    expectDomainError(
      () => manageBoard(board, carol, { kind: "removeMember", member: bob }),
      "unauthorized",
    );
    expectDomainError(
      () => manageBoard(board, carol, { kind: "changeState", target: LifecycleState.InProgress }),
      "unauthorized",
    );
  });
});