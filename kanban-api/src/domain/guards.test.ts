import { describe, expect, it } from "vitest";
import { LifecycleState } from "./entities";
import {
  allowedBoardTransitions,
  allowedTaskTransitions,
  boardCanBeDone,
  isBoardFrozen,
  isEditable,
} from "./guards";
import { makeBoard, makeTask } from "./fixtures";

describe("boardCanBeDone", () => {
  it("allows an empty board", () => {
    expect(boardCanBeDone(makeBoard())).toBe(true);
  });

  it("allows a board whose tasks are all Done or Cancelled", () => {
    const board = makeBoard({
      tasks: [
        makeTask({ state: LifecycleState.Done }),
        makeTask({ state: LifecycleState.Cancelled }),
      ],
    });
    expect(boardCanBeDone(board)).toBe(true);
  });

  it("blocks a board with a To Do, In Progress, or Blocked task", () => {
    for (const state of [
      LifecycleState.ToDo,
      LifecycleState.InProgress,
      LifecycleState.Blocked,
    ]) {
      const board = makeBoard({ tasks: [makeTask({ state })] });
      expect(boardCanBeDone(board)).toBe(false);
    }
  });
});

describe("isBoardFrozen", () => {
  it("is frozen for Blocked, Cancelled, and Done", () => {
    for (const state of [LifecycleState.Blocked, LifecycleState.Cancelled, LifecycleState.Done]) {
      expect(isBoardFrozen(makeBoard({ state }))).toBe(true);
    }
  });

  it("is not frozen for To Do or In Progress", () => {
    for (const state of [LifecycleState.ToDo, LifecycleState.InProgress]) {
      expect(isBoardFrozen(makeBoard({ state }))).toBe(false);
    }
  });
});

describe("isEditable", () => {
  it("allows editing live tasks on a live board", () => {
    const board = makeBoard();
    const task = makeTask();
    expect(isEditable(board, task)).toBe(true);
  });

  it("rejects editing on a Blocked board while keeping the task state", () => {
    const board = makeBoard({ state: LifecycleState.Blocked });
    const task = makeTask({ state: LifecycleState.InProgress });
    expect(isEditable(board, task)).toBe(false);
  });

  it("rejects editing on a Cancelled board", () => {
    expect(isEditable(makeBoard({ state: LifecycleState.Cancelled }), makeTask())).toBe(false);
  });

  it("rejects editing on a Done board", () => {
    expect(isEditable(makeBoard({ state: LifecycleState.Done }), makeTask())).toBe(false);
  });

  it("rejects editing a Done or Cancelled task on a live board", () => {
    const board = makeBoard();
    expect(isEditable(board, makeTask({ state: LifecycleState.Done }))).toBe(false);
    expect(isEditable(board, makeTask({ state: LifecycleState.Cancelled }))).toBe(false);
  });
});

describe("allowedTaskTransitions", () => {
  it("lists the next states for a live task on a live board", () => {
    const board = makeBoard();
    expect(allowedTaskTransitions(board, makeTask())).toEqual([
      LifecycleState.InProgress,
      LifecycleState.Cancelled,
    ]);
    expect(allowedTaskTransitions(board, makeTask({ state: LifecycleState.InProgress }))).toEqual([
      LifecycleState.Done,
      LifecycleState.Blocked,
      LifecycleState.Cancelled,
    ]);
  });

  it("returns nothing for a terminal task on a live board", () => {
    const board = makeBoard();
    expect(allowedTaskTransitions(board, makeTask({ state: LifecycleState.Done }))).toEqual([]);
    expect(allowedTaskTransitions(board, makeTask({ state: LifecycleState.Cancelled }))).toEqual([]);
  });

  it("returns nothing for a live task on a frozen board", () => {
    for (const state of [
      LifecycleState.Blocked,
      LifecycleState.Cancelled,
      LifecycleState.Done,
    ]) {
      const board = makeBoard({ state });
      expect(allowedTaskTransitions(board, makeTask())).toEqual([]);
    }
  });

  it("returns In Progress for a Blocked task with InProgress previous state", () => {
    const board = makeBoard();
    expect(
      allowedTaskTransitions(board, makeTask({ state: LifecycleState.Blocked, previousState: LifecycleState.ToDo })),
    ).toEqual([]);
    expect(
      allowedTaskTransitions(board, makeTask({ state: LifecycleState.Blocked, previousState: LifecycleState.InProgress })),
    ).toEqual([LifecycleState.InProgress]);
  });
});

describe("allowedBoardTransitions", () => {
  it("lists the next states for a live board without a Done gate pass", () => {
    const board = makeBoard({ tasks: [makeTask()] });
    expect(allowedBoardTransitions(board)).toEqual([
      LifecycleState.InProgress,
      LifecycleState.Cancelled,
    ]);
  });

  it("includes Done when the board Done gate passes", () => {
    const board = makeBoard({ state: LifecycleState.InProgress, tasks: [makeTask({ state: LifecycleState.Done })] });
    expect(allowedBoardTransitions(board)).toEqual([
      LifecycleState.Done,
      LifecycleState.Blocked,
      LifecycleState.Cancelled,
    ]);
  });

  it("excludes Done while live tasks remain", () => {
    const board = makeBoard({ state: LifecycleState.InProgress, tasks: [makeTask()] });
    expect(allowedBoardTransitions(board)).toEqual([
      LifecycleState.Blocked,
      LifecycleState.Cancelled,
    ]);
  });

  it("returns the previous state for a Blocked board", () => {
    const board = makeBoard({ state: LifecycleState.Blocked, previousState: LifecycleState.InProgress });
    expect(allowedBoardTransitions(board)).toEqual([LifecycleState.InProgress]);
  });

  it("returns nothing for a terminal board", () => {
    expect(allowedBoardTransitions(makeBoard({ state: LifecycleState.Done }))).toEqual([]);
    expect(allowedBoardTransitions(makeBoard({ state: LifecycleState.Cancelled }))).toEqual([]);
  });
});