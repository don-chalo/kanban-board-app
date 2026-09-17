import { describe, expect, it } from "vitest";
import { Action, authorize } from "./authorize";
import { canView, canViewTask } from "./canview";
import { makeBoard, makeTask, alice, bob, carol } from "./fixtures";

const board = makeBoard({ creator: alice, owner: bob, associated: [carol] });
const taskByCarol = makeTask({ creator: carol, owner: carol });
const taskByAlice = makeTask({ creator: alice, owner: alice });
const outsider = "user-outsider";

describe("authorize: visibility", () => {
  it("grants task visibility to every member role", () => {
    expect(authorize(Action.ViewBoard, board, null, alice)).toBe(true);
    expect(authorize(Action.ViewBoard, board, null, bob)).toBe(true);
    expect(authorize(Action.ViewTask, board, taskByCarol, carol)).toBe(true);
  });

  it("denies visibility to a non-member", () => {
    expect(authorize(Action.ViewBoard, board, null, outsider)).toBe(false);
    expect(authorize(Action.ViewTask, board, taskByCarol, outsider)).toBe(false);
  });
});

describe("canView / canViewTask", () => {
  it("grants board and task visibility to every member role", () => {
    for (const member of [alice, bob, carol]) {
      expect(canView(board, member)).toBe(true);
      expect(canViewTask(board, member)).toBe(true);
    }
  });

  it("denies a non-member", () => {
    expect(canView(board, outsider)).toBe(false);
    expect(canViewTask(board, outsider)).toBe(false);
  });
});

describe("authorize: task creation", () => {
  it("lets any member create a task", () => {
    for (const member of [alice, bob, carol]) {
      expect(authorize(Action.CreateTask, board, null, member)).toBe(true);
    }
  });

  it("denies non-members", () => {
    expect(authorize(Action.CreateTask, board, null, outsider)).toBe(false);
  });
});

describe("authorize: edit and move scoping", () => {
  it("lets a Task Owner edit and move their own task", () => {
    expect(authorize(Action.EditTask, board, taskByCarol, carol)).toBe(true);
    expect(authorize(Action.MoveTask, board, taskByCarol, carol)).toBe(true);
  });

  it("denies an Associated member editing another member's task", () => {
    expect(authorize(Action.EditTask, board, taskByAlice, carol)).toBe(false);
    expect(authorize(Action.MoveTask, board, taskByAlice, carol)).toBe(false);
  });

  it("lets the Board Owner edit and move any task", () => {
    expect(authorize(Action.EditTask, board, taskByCarol, bob)).toBe(true);
    expect(authorize(Action.MoveTask, board, taskByCarol, bob)).toBe(true);
  });

  it("lets the Board Creator edit and move any task", () => {
    expect(authorize(Action.EditTask, board, taskByCarol, alice)).toBe(true);
  });

  it("denies outsiders", () => {
    expect(authorize(Action.EditTask, board, taskByCarol, outsider)).toBe(false);
    expect(authorize(Action.MoveTask, board, taskByCarol, outsider)).toBe(false);
  });
});

describe("authorize: task deletion", () => {
  it("lets only the Board Creator/Owner delete", () => {
    expect(authorize(Action.DeleteTask, board, taskByCarol, alice)).toBe(true);
    expect(authorize(Action.DeleteTask, board, taskByCarol, bob)).toBe(true);
  });

  it("denies the Task Owner who is only an Associated member", () => {
    expect(authorize(Action.DeleteTask, board, taskByCarol, carol)).toBe(false);
  });

  it("denies outsiders", () => {
    expect(authorize(Action.DeleteTask, board, taskByCarol, outsider)).toBe(false);
  });
});

describe("authorize: reassignment", () => {
  it("lets only the Board Creator/Owner reassign", () => {
    expect(authorize(Action.ReassignTaskOwner, board, taskByCarol, alice)).toBe(true);
    expect(authorize(Action.ReassignTaskOwner, board, taskByCarol, bob)).toBe(true);
    expect(authorize(Action.ReassignTaskOwner, board, taskByCarol, carol)).toBe(false);
    expect(authorize(Action.ReassignTaskOwner, board, taskByCarol, outsider)).toBe(false);
  });
});

describe("authorize: board management", () => {
  it("lets only the Board Creator/Owner manage the board", () => {
    expect(authorize(Action.ManageBoard, board, null, alice)).toBe(true);
    expect(authorize(Action.ManageBoard, board, null, bob)).toBe(true);
    expect(authorize(Action.ManageBoard, board, null, carol)).toBe(false);
    expect(authorize(Action.ManageBoard, board, null, outsider)).toBe(false);
  });
});