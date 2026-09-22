import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addBoardMember,
  batchUsers,
  boardActions,
  createBoard,
  createComment,
  createTask,
  createTaskComment,
  editComment,
  editTaskComment,
  getBoard,
  getTransitions,
  getUser,
  listBoards,
  login,
  moveBoard,
  moveTask,
  removeComment,
  removeTaskComment,
  resolveUser,
  searchUsers,
  setTaskOwner,
  taskActions,
  updateBoard,
  updateTask,
  removeMember,
} from "./api";

function setIdentity(id: string = "user-1"): void {
  localStorage.setItem("todo.identity", JSON.stringify({ id, email: "alice@example.com" }));
}

describe("login", () => {
  it("resolves with the identity on a 200 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "user-1", email: "alice@example.com" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(login("alice@example.com")).resolves.toEqual({
      id: "user-1",
      email: "alice@example.com",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "alice@example.com" }),
      }),
    );
  });

  it("rejects when the API responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(login("alice@example.com")).rejects.toThrow("Login failed (500)");
  });
});

describe("listBoards", () => {
  const boards = [
    {
      id: "board-1",
      title: "Alpha",
      description: "",
      creator: "user-1",
      owner: "user-1",
      associated: [],
      state: "To Do",
      previousState: null,
      tasks: [],
    },
  ];

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setIdentity();
  });

  it("resolves with the boards on a 200 response, sending the X-User-Id header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => boards,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listBoards()).resolves.toEqual({ status: "ok", boards });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards",
      expect.objectContaining({
        headers: { "X-User-Id": "user-1" },
      }),
    );
  });

  it("returns unauthorized on a 401 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(listBoards()).resolves.toEqual({ status: "unauthorized" });
  });

  it("returns error on an unexpected status response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(listBoards()).resolves.toEqual({ status: "error" });
  });

  it("returns error when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(listBoards()).resolves.toEqual({ status: "error" });
  });
});

describe("createBoard", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setIdentity();
  });

  it("posts the title with the X-User-Id header and resolves with the created board", async () => {
    const board = {
      id: "board-2",
      title: "Beta",
      description: "",
      creator: "user-1",
      owner: "user-1",
      associated: [],
      state: "To Do",
      previousState: null,
      tasks: [],
      comments: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => board,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createBoard("Beta")).resolves.toEqual(board);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "user-1" },
        body: JSON.stringify({ title: "Beta" }),
      }),
    );
  });

  it("rejects when the API responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(createBoard("Beta")).rejects.toThrow("Create board failed (500)");
  });
});

const taskFixture = {
  id: "task-1",
  boardId: "board-1",
  creator: "user-1",
  owner: "user-2",
  title: "Write tests",
  description: "",
  state: "ToDo",
  previousState: null,
  comments: [],
};

const boardFixture = {
  id: "board-1",
  title: "Alpha",
  description: "",
  creator: "user-1",
  owner: "user-1",
  associated: ["user-2"],
  state: "ToDo",
  previousState: null,
  tasks: [taskFixture],
  comments: [],
};

describe("getBoard", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setIdentity();
  });

  it("resolves with the board on a 200 response, sending the X-User-Id header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => boardFixture,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBoard("board-1")).resolves.toEqual({ status: "ok", board: boardFixture });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1",
      expect.objectContaining({ headers: { "X-User-Id": "user-1" } }),
    );
  });

  it("returns unauthorized on a 401 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(getBoard("board-1")).resolves.toEqual({ status: "unauthorized" });
  });

  it("returns error on an unexpected status response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(getBoard("board-1")).resolves.toEqual({ status: "error" });
  });

  it("returns error when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(getBoard("board-1")).resolves.toEqual({ status: "error" });
  });
});

describe("getUser", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setIdentity();
  });

  it("resolves with the user on a 200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "user-2", email: "bob@example.com" }),
      }),
    );

    await expect(getUser("user-2")).resolves.toEqual({
      id: "user-2",
      email: "bob@example.com",
    });
  });

  it("resolves with null on a 404 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(getUser("ghost")).resolves.toBeNull();
  });

  it("rejects on other failure statuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(getUser("user-2")).rejects.toThrow("Get user failed (500)");
  });
});

describe("move and action endpoints", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setIdentity();
  });

  it("boardActions returns the legal target states", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ["InProgress", "Blocked", "Cancelled"],
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(boardActions("board-1")).resolves.toEqual([
      "InProgress",
      "Blocked",
      "Cancelled",
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/actions",
      expect.objectContaining({ headers: { "X-User-Id": "user-1" } }),
    );
  });

  it("taskActions returns the legal target states", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ["InProgress", "Blocked", "Cancelled"],
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(taskActions("board-1", "task-1")).resolves.toEqual([
      "InProgress",
      "Blocked",
      "Cancelled",
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks/task-1/actions",
      expect.objectContaining({ headers: { "X-User-Id": "user-1" } }),
    );
  });

  it("createTask posts title and optional description with the X-User-Id header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => taskFixture,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createTask("board-1", { title: "Write tests", description: "Cover moves" }),
    ).resolves.toEqual(taskFixture);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "user-1" },
        body: JSON.stringify({ title: "Write tests", description: "Cover moves" }),
      }),
    );
  });

  it("createTask omits description when not provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => taskFixture,
    });
    vi.stubGlobal("fetch", fetchMock);

    await createTask("board-1", { title: "Write tests" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks",
      expect.objectContaining({ body: JSON.stringify({ title: "Write tests" }) }),
    );
  });

  it("moveBoard posts the target state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...boardFixture, state: "InProgress" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await moveBoard("board-1", "InProgress");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/state",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ target: "InProgress" }),
      }),
    );
  });

  it("updateBoard patches the provided fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...boardFixture, title: "Beta" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const board = await updateBoard("board-1", {
      title: "Beta",
      description: "d",
      owner: "user-2",
    });
    expect(board.title).toBe("Beta");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ title: "Beta", description: "d", owner: "user-2" }),
      }),
    );
  });

  it("updateBoard sends only the provided fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...boardFixture, description: "" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateBoard("board-1", { description: "" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ description: "" }),
      }),
    );
  });

  it("updateBoard rejects when the API responds with an error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateBoard("board-1", { title: "Beta" })).rejects.toThrow(
      "Update board failed (500)",
    );
  });

  it("moveTask posts the target state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...taskFixture, state: "InProgress" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await moveTask("board-1", "task-1", "InProgress");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks/task-1/state",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ target: "InProgress" }),
      }),
    );
  });

  it("setTaskOwner posts the new owner", async () => {    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...taskFixture, owner: "user-3" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await setTaskOwner("board-1", "task-1", "user-3");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks/task-1/owner",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ owner: "user-3" }),
      }),
    );
  });

  it("updateTask patches the provided fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...taskFixture, title: "New title" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const task = await updateTask("board-1", "task-1", { title: "New title", description: "New desc" });
    expect(task.title).toBe("New title");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks/task-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ title: "New title", description: "New desc" }),
      }),
    );
  });

  it("updateTask sends only the provided fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...taskFixture, description: "" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateTask("board-1", "task-1", { description: "" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks/task-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ description: "" }),
      }),
    );
  });

  it("updateTask rejects when the API responds with an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(updateTask("board-1", "task-1", { title: "T" })).rejects.toThrow(
      "Update task failed (500)",
    );
  });

  it("rejects on error responses for the move and action endpoints", async () => {
    for (const [name, call] of [
      ["Board actions failed", () => boardActions("board-1")],
      ["Task actions failed", () => taskActions("board-1", "task-1")],
      ["Create task failed", () => createTask("board-1", { title: "T" })],
      ["Move board failed", () => moveBoard("board-1", "InProgress")],
      ["Move task failed", () => moveTask("board-1", "task-1", "InProgress")],
      ["Set task owner failed", () => setTaskOwner("board-1", "task-1", "user-3")],
      ["Update task failed", () => updateTask("board-1", "task-1", { title: "T" })],
      ["Create comment failed", () => createComment("board-1", "Hi")],
      ["Edit comment failed", () => editComment("board-1", "comment-1", "Hi")],
      ["Remove comment failed", () => removeComment("board-1", "comment-1")],
    ] as const) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      await expect(call()).rejects.toThrow(name);
      vi.unstubAllGlobals();
    }
  });

  it("creates, edits, and removes board comments", async () => {
    const comment = { id: "comment-1", author: "user-1", text: "Hi", createdAt: "2026-09-21T10:00:00.000Z" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => comment });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createComment("board-1", "Hi")).resolves.toEqual(comment);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "Hi" }),
      }),
    );

    await expect(editComment("board-1", "comment-1", "Hey")).resolves.toEqual(comment);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/comments/comment-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ text: "Hey" }),
      }),
    );

    await expect(removeComment("board-1", "comment-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/comments/comment-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("creates, edits, and removes task comments", async () => {
    const comment = { id: "comment-1", author: "user-1", text: "Hi", createdAt: "2026-09-21T10:00:00.000Z" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => comment });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createTaskComment("board-1", "task-1", "Hi")).resolves.toEqual(comment);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks/task-1/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "Hi" }),
      }),
    );

    await expect(editTaskComment("board-1", "task-1", "comment-1", "Hey")).resolves.toEqual(comment);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks/task-1/comments/comment-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ text: "Hey" }),
      }),
    );

    await expect(removeTaskComment("board-1", "task-1", "comment-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/tasks/task-1/comments/comment-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("rejects task comment calls on error responses", async () => {
    for (const [name, call] of [
      ["Create task comment failed", () => createTaskComment("board-1", "task-1", "Hi")],
      ["Edit task comment failed", () => editTaskComment("board-1", "task-1", "comment-1", "Hi")],
      ["Remove task comment failed", () => removeTaskComment("board-1", "task-1", "comment-1")],
    ] as const) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      await expect(call()).rejects.toThrow(name);
      vi.unstubAllGlobals();
    }
  });
});

describe("user and member endpoints", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setIdentity();
  });

  it("searchUsers fetches the prefix with the X-User-Id header and returns identities", async () => {
    const identities = [{ id: "user-2", email: "bob@example.com" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => identities }),
    );

    await expect(searchUsers("bob")).resolves.toEqual(identities);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/users?email=bob",
      expect.objectContaining({ headers: { "X-User-Id": "user-1" } }),
    );
  });

  it("searchUsers encodes the prefix query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }),
    );

    await searchUsers(" bob@exam ple");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/users?email=%20bob%40exam%20ple",
      expect.anything(),
    );
  });

  it("searchUsers rejects on an error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(searchUsers("bob")).rejects.toThrow("User search failed (500)");
  });

  it("resolveUser posts the email with headers and returns the identity", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "user-3", email: "carol@example.com" }),
      }),
    );

    await expect(resolveUser("carol@example.com")).resolves.toEqual({
      id: "user-3",
      email: "carol@example.com",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/users/resolve",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "user-1" },
        body: JSON.stringify({ email: "carol@example.com" }),
      }),
    );
  });

  it("resolveUser rejects on an error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(resolveUser("carol@example.com")).rejects.toThrow("Resolve user failed (500)");
  });

  it("addBoardMember posts the member with headers and returns the board", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => boardFixture }),
    );

    await expect(addBoardMember("board-1", "user-3")).resolves.toEqual(boardFixture);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/members",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "user-1" },
        body: JSON.stringify({ member: "user-3" }),
      }),
    );
  });

  it("addBoardMember rejects on an error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(addBoardMember("board-1", "user-3")).rejects.toThrow(
      "Add board member failed (500)",
    );
  });

  it("addBoardMember rejects on 409 read_only", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409 }));

    await expect(addBoardMember("board-1", "user-3")).rejects.toThrow(
      "Add board member failed (409)",
    );
  });

  it("removeMember deletes the member with headers and returns the board", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => boardFixture }),
    );

    await expect(removeMember("board-1", "user-3")).resolves.toEqual(boardFixture);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/boards/board-1/members/user-3",
      expect.objectContaining({
        method: "DELETE",
        headers: { "X-User-Id": "user-1" },
      }),
    );
  });

  it("removeMember rejects on an error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(removeMember("board-1", "user-3")).rejects.toThrow(
      "Remove board member failed (500)",
    );
  });

  it("getTransitions fetches the table with the X-User-Id header", async () => {
    const table = {
      transitions: {
        ToDo: ["InProgress", "Cancelled"],
        InProgress: ["Done", "Blocked", "Cancelled"],
        Done: [],
        Cancelled: [],
        Blocked: ["InProgress"],
      },
      frozenStates: ["Blocked", "Cancelled", "Done"],
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => table });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTransitions()).resolves.toEqual(table);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/transitions",
      expect.objectContaining({ headers: { "X-User-Id": "user-1" } }),
    );
  });

  it("getTransitions rejects on an error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(getTransitions()).rejects.toThrow("Get transitions failed (500)");
  });

  it("batchUsers posts ids with headers and returns identities", async () => {
    const identities = [{ id: "user-2", email: "bob@example.com" }];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => identities });
    vi.stubGlobal("fetch", fetchMock);

    await expect(batchUsers(["user-2"])).resolves.toEqual(identities);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/users/batch",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "user-1" },
        body: JSON.stringify({ ids: ["user-2"] }),
      }),
    );
  });

  it("batchUsers rejects on an error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(batchUsers(["user-2"])).rejects.toThrow("Batch users failed (500)");
  });
});