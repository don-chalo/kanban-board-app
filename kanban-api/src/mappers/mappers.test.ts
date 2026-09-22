import { describe, expect, it } from "vitest";
import { LifecycleState, Task } from "../domain/entities";
import { boardDocToDomain, boardToDoc, taskDocToDomain, taskToDoc, userDocToDomain, userToDoc } from "./index";

describe("user mapper", () => {
  it("maps a doc to a domain user and back", () => {
    const doc = { _id: "user-1", email: "alice@example.com" };
    const user = userDocToDomain(doc);
    expect(user).toEqual({ id: "user-1", email: "alice@example.com" });
    expect(userToDoc(user)).toEqual(doc);
  });
});

describe("task mapper", () => {
  it("maps a doc to a domain task and back", () => {
    const doc = {
      _id: "task-1",
      boardId: "board-1",
      creator: "user-1",
      owner: "user-2",
      title: "Write docs",
      description: "Details",
      state: "Blocked",
      previousState: "InProgress",
      priority: "high",
      startedAt: "2026-09-16T10:00:00.000Z",
      storyPoints: 5,
      comments: [
        { _id: "comment-1", author: "user-1", text: "Hi", createdAt: "2026-09-21T10:00:00.000Z" },
      ],
    };
    const task = taskDocToDomain(doc);
    expect(task).toEqual({
      id: "task-1",
      boardId: "board-1",
      creator: "user-1",
      owner: "user-2",
      title: "Write docs",
      description: "Details",
      state: LifecycleState.Blocked,
      previousState: LifecycleState.InProgress,
      priority: "high",
      startedAt: "2026-09-16T10:00:00.000Z",
      storyPoints: 5,
      comments: [
        { id: "comment-1", author: "user-1", text: "Hi", createdAt: "2026-09-21T10:00:00.000Z" },
      ],
    });
    expect(taskToDoc(task)).toEqual(doc);
  });

  it("reads a legacy task doc without comments as empty", () => {
    const doc = {
      _id: "task-1",
      boardId: "board-1",
      creator: "user-1",
      owner: "user-2",
      title: "Write docs",
      description: "Details",
      state: "Blocked",
      previousState: "InProgress",
    };
    expect(taskDocToDomain(doc).comments).toEqual([]);
  });

  it("reads a legacy doc without priority as medium", () => {
    const doc = {
      _id: "task-1",
      boardId: "board-1",
      creator: "user-1",
      owner: "user-2",
      title: "Write docs",
      description: "Details",
      state: "Blocked",
      previousState: "InProgress",
    };
    expect(taskDocToDomain(doc).priority).toBe("medium");
  });

  it("reads a legacy doc without start date as null", () => {
    const doc = {
      _id: "task-1",
      boardId: "board-1",
      creator: "user-1",
      owner: "user-2",
      title: "Write docs",
      description: "Details",
      state: "Blocked",
      previousState: "InProgress",
    };
    expect(taskDocToDomain(doc).startedAt).toBeNull();
  });

  it("reads a legacy doc without estimate as null", () => {
    const doc = {
      _id: "task-1",
      boardId: "board-1",
      creator: "user-1",
      owner: "user-2",
      title: "Write docs",
      description: "Details",
      state: "Blocked",
      previousState: "InProgress",
    };
    expect(taskDocToDomain(doc).storyPoints).toBeNull();
  });

  it("preserves a null previous state", () => {
    const task: Task = {
      id: "task-1",
      boardId: "board-1",
      creator: "user-1",
      owner: "user-1",
      title: "t",
      description: "",
      state: LifecycleState.ToDo,
      previousState: null,
      priority: "medium",
      startedAt: null,
      storyPoints: null,
      comments: [],
    };
    expect(taskToDoc(task).previousState).toBeNull();
  });
});

describe("board mapper", () => {
  it("maps a doc to a domain board with tasks and back", () => {
    const doc = {
      _id: "board-1",
      title: "Docs",
      description: "Notes",
      creator: "user-1",
      owner: "user-1",
      associated: ["user-2", "user-3"],
      state: "Cancelled",
      previousState: "InProgress",
      comments: [
        { _id: "comment-1", author: "user-2", text: "Hi", createdAt: "2026-09-21T10:00:00.000Z" },
      ],
    };
    const task: Task = {
      id: "task-1",
      boardId: "board-1",
      creator: "user-1",
      owner: "user-2",
      title: "t",
      description: "",
      state: LifecycleState.ToDo,
      previousState: null,
      priority: "medium",
      startedAt: null,
      storyPoints: null,
    };
    const board = boardDocToDomain(doc, [task]);
    expect(board).toEqual({
      id: "board-1",
      title: "Docs",
      description: "Notes",
      creator: "user-1",
      owner: "user-1",
      associated: ["user-2", "user-3"],
      state: LifecycleState.Cancelled,
      previousState: LifecycleState.InProgress,
      tasks: [task],
      comments: [
        { id: "comment-1", author: "user-2", text: "Hi", createdAt: "2026-09-21T10:00:00.000Z" },
      ],
    });
    expect(boardToDoc(board)).toEqual(doc);
  });

  it("reads a legacy doc without comments as empty", () => {
    const doc = {
      _id: "board-1",
      title: "Docs",
      description: "",
      creator: "user-1",
      owner: "user-1",
      associated: [],
      state: "ToDo",
      previousState: null,
    };
    expect(boardDocToDomain(doc).comments).toEqual([]);
  });

  it("defaults to no tasks", () => {
    const doc = {
      _id: "board-1",
      title: "Docs",
      description: "",
      creator: "user-1",
      owner: "user-1",
      associated: [],
      state: "ToDo",
      previousState: null,
    };
    expect(boardDocToDomain(doc).tasks).toEqual([]);
  });
});