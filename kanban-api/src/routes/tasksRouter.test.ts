import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { BoardModel, TaskModel, UserModel } from "../models";
import { startTestMongo, stopTestMongo } from "../test/mongo";
import { buildApp } from "./testApp";

type App = ReturnType<typeof buildApp>;

async function createUser(app: App, email: string): Promise<string> {
  const res = await request(app).post("/login").send({ email });
  return res.body.id;
}

async function createBoard(app: App, actorId: string, title: string) {
  const res = await request(app).post("/boards").set("X-User-Id", actorId).send({ title });
  return res.body;
}

async function createTask(app: App, boardId: string, actorId: string, title: string) {
  const res = await request(app)
    .post(`/boards/${boardId}/tasks`)
    .set("X-User-Id", actorId)
    .send({ title });
  return res.body;
}

async function setupBoard() {
  const app = buildApp();
  const alice = await createUser(app, "alice@example.com");
  const bob = await createUser(app, "bob@example.com");
  const carol = await createUser(app, "carol@example.com");
  const board = await createBoard(app, alice, "Docs");
  await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: bob });
  return { app, alice, bob, carol, board };
}

describe("tasks router", () => {
  beforeAll(startTestMongo);
  afterAll(stopTestMongo);

  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      BoardModel.deleteMany({}),
      TaskModel.deleteMany({}),
    ]);
  });

  it("member creates a task owned by them in To Do", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const res = await request(app)
      .post(`/boards/${board.id}/tasks`)
      .set("X-User-Id", bob)
      .send({ title: "Bob's task" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "Bob's task", creator: bob, owner: bob, state: "ToDo" });

    const list = await request(app).get(`/boards/${board.id}/tasks`).set("X-User-Id", alice);
    expect(list.body.map((t: { title: string }) => t.title)).toContain("Bob's task");
  });

  it("rejects task creation on a Blocked board", async () => {
    const { app, alice, board } = await setupBoard();
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "Blocked" });
    const res = await request(app)
      .post(`/boards/${board.id}/tasks`)
      .set("X-User-Id", alice)
      .send({ title: "Frozen task" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("read_only");
  });

  it("rejects task creation on terminal boards", async () => {
    for (const state of ["Done", "Cancelled"] as const) {
      const { app, alice, board } = await setupBoard();
      const task = await createTask(app, board.id, alice, "t");
      await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
      await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
      await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: state });
      await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: state });
      const res = await request(app)
        .post(`/boards/${board.id}/tasks`)
        .set("X-User-Id", alice)
        .send({ title: "Late task" });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("read_only");
    }
  });

  it("task owner edits the task", async () => {
    const { app, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    const res = await request(app)
      .patch(`/boards/${board.id}/tasks/${task.id}`)
      .set("X-User-Id", bob)
      .send({ title: "Edited", description: "Now with details" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: "Edited", description: "Now with details" });
  });

  it("rejects a blank title on edit with a 400 and leaves the task unchanged", async () => {
    const { app, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    const res = await request(app)
      .patch(`/boards/${board.id}/tasks/${task.id}`)
      .set("X-User-Id", bob)
      .send({ title: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");

    const after = await request(app)
      .get(`/boards/${board.id}/tasks/${task.id}`)
      .set("X-User-Id", bob);
    expect(after.status).toBe(200);
    expect(after.body).toMatchObject({ title: "Task" });
  });

  it("board creator deletes a task permanently", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    const res = await request(app)
      .delete(`/boards/${board.id}/tasks/${task.id}`)
      .set("X-User-Id", alice);
    expect(res.status).toBe(200);
    const gone = await request(app)
      .get(`/boards/${board.id}/tasks/${task.id}`)
      .set("X-User-Id", alice);
    expect(gone.status).toBe(404);
    expect((await request(app).get(`/boards/${board.id}`).set("X-User-Id", alice)).body.tasks).toEqual([]);
  });

  it("associated member cannot delete a task", async () => {
    const { app, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    const res = await request(app)
      .delete(`/boards/${board.id}/tasks/${task.id}`)
      .set("X-User-Id", bob);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("task owner works through the lifecycle and blocked returns to previous", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });

    const toInProgress = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/state`)
      .set("X-User-Id", bob)
      .send({ target: "InProgress" });
    expect(toInProgress.body.state).toBe("InProgress");

    const toBlocked = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/state`)
      .set("X-User-Id", bob)
      .send({ target: "Blocked" });
    expect(toBlocked.body.state).toBe("Blocked");

    const back = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/state`)
      .set("X-User-Id", bob)
      .send({ target: "InProgress" });
    expect(back.body.state).toBe("InProgress");
  });

  it("rejects a backtracking transition with a conflict", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", bob).send({ target: "InProgress" });
    const res = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/state`)
      .set("X-User-Id", bob)
      .send({ target: "ToDo" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("invalid_transition");
  });

  it("rejects a task move while the board is not In Progress", async () => {
    const { app, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    const res = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/state`)
      .set("X-User-Id", bob)
      .send({ target: "InProgress" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("board_not_in_progress");
  });

  it("terminal task is read-only", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", bob).send({ target: "Cancelled" });
    const res = await request(app)
      .patch(`/boards/${board.id}/tasks/${task.id}`)
      .set("X-User-Id", bob)
      .send({ title: "x" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("read_only");
  });

  it("board owner reassigns a task owner", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    const res = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/owner`)
      .set("X-User-Id", alice)
      .send({ owner: bob });
    expect(res.status).toBe(200);
    expect(res.body.owner).toBe(bob);
  });

  it("rejects owner reassignment to a non-member", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    const res = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/owner`)
      .set("X-User-Id", alice)
      .send({ owner: "user-outsider" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("member_required");
  });

  it("enforces the board Done gate", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    const res = await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "Done" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("board_not_done");
    expect(task.id).toBeTruthy();
  });

  it("returns next-actions for a live task", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    const res = await request(app).get(`/boards/${board.id}/tasks/${task.id}/actions`).set("X-User-Id", bob);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["InProgress", "Cancelled"]);
  });

  it("returns empty next-actions for a task on a board that is not In Progress", async () => {
    const { app, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    const res = await request(app).get(`/boards/${board.id}/tasks/${task.id}/actions`).set("X-User-Id", bob);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns empty next-actions for a terminal task", async () => {
    const { app, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", bob).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", bob).send({ target: "Done" });
    const res = await request(app).get(`/boards/${board.id}/tasks/${task.id}/actions`).set("X-User-Id", bob);
    expect(res.body).toEqual([]);
  });

  it("returns previous-state next-actions for a blocked task", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", bob).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", bob).send({ target: "Blocked" });
    const res = await request(app).get(`/boards/${board.id}/tasks/${task.id}/actions`).set("X-User-Id", bob);
    expect(res.body).toEqual(["InProgress"]);
  });

  it("denies task reads and actions to a non-member", async () => {
    const { app, alice, carol, board } = await setupBoard();
    const task = await createTask(app, board.id, alice, "Task");
    const list = await request(app).get(`/boards/${board.id}/tasks`).set("X-User-Id", carol);
    expect(list.status).toBe(403);
    const actions = await request(app).get(`/boards/${board.id}/tasks/${task.id}/actions`).set("X-User-Id", carol);
    expect(actions.status).toBe(403);
  });

  it("returns 404 for a missing task", async () => {
    const { app, alice, board } = await setupBoard();
    const res = await request(app).get(`/boards/${board.id}/tasks/nope`).set("X-User-Id", alice);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("creates a task comment and embeds it in the task payload", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");

    const created = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/comments`)
      .set("X-User-Id", bob)
      .send({ text: "On it" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ author: bob, text: "On it" });
    expect(created.body.id).toBeTruthy();
    expect(created.body.createdAt).toBeTruthy();

    const fetched = await request(app)
      .get(`/boards/${board.id}/tasks/${task.id}`)
      .set("X-User-Id", alice);
    expect(fetched.body.comments).toHaveLength(1);
    expect(fetched.body.comments[0]).toMatchObject({ author: bob, text: "On it" });
  });

  it("rejects blank and overlong task comment text", async () => {
    const { app, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");

    const blank = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/comments`)
      .set("X-User-Id", bob)
      .send({ text: "   " });
    expect(blank.status).toBe(400);
    expect(blank.body.error.code).toBe("validation");

    const overlong = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/comments`)
      .set("X-User-Id", bob)
      .send({ text: "x".repeat(2001) });
    expect(overlong.status).toBe(400);
    expect(overlong.body.error.code).toBe("validation");
  });

  it("denies task comments to non-members and unknown actors", async () => {
    const { app, bob, carol, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");

    const forbidden = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/comments`)
      .set("X-User-Id", carol)
      .send({ text: "Hi" });
    expect(forbidden.status).toBe(403);

    const unknown = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/comments`)
      .set("X-User-Id", "user-ghost")
      .send({ text: "Hi" });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe("unknown_actor");
  });

  it("edits and removes task comments as author, manager, or task owner", async () => {
    const { app, alice, bob, board } = await setupBoard();
    const task = await createTask(app, board.id, bob, "Task");

    const created = (
      await request(app)
        .post(`/boards/${board.id}/tasks/${task.id}/comments`)
        .set("X-User-Id", alice)
        .send({ text: "Draft" })
    ).body;

    const byOwner = await request(app)
      .patch(`/boards/${board.id}/tasks/${task.id}/comments/${created.id}`)
      .set("X-User-Id", bob)
      .send({ text: "Edited by task owner" });
    expect(byOwner.status).toBe(200);
    expect(byOwner.body.text).toBe("Edited by task owner");

    const missing = await request(app)
      .patch(`/boards/${board.id}/tasks/${task.id}/comments/comment-ghost`)
      .set("X-User-Id", alice)
      .send({ text: "x" });
    expect(missing.status).toBe(404);

    const removed = await request(app)
      .delete(`/boards/${board.id}/tasks/${task.id}/comments/${created.id}`)
      .set("X-User-Id", alice);
    expect(removed.status).toBe(200);

    const fetched = await request(app)
      .get(`/boards/${board.id}/tasks/${task.id}`)
      .set("X-User-Id", alice);
    expect(fetched.body.comments).toEqual([]);
  });

  it("rejects task comment edits from members with no power over the thread", async () => {
    const app = buildApp();
    const alice = await createUser(app, "alice@example.com");
    const bob = await createUser(app, "bob@example.com");
    const carol = await createUser(app, "carol@example.com");
    const board = await createBoard(app, alice, "Docs");
    await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: bob });
    await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: carol });
    const task = await createTask(app, board.id, alice, "Task");

    const created = (
      await request(app)
        .post(`/boards/${board.id}/tasks/${task.id}/comments`)
        .set("X-User-Id", alice)
        .send({ text: "Draft" })
    ).body;

    const denied = await request(app)
      .patch(`/boards/${board.id}/tasks/${task.id}/comments/${created.id}`)
      .set("X-User-Id", carol)
      .send({ text: "Hijack" });
    expect(denied.status).toBe(403);

    const deleteDenied = await request(app)
      .delete(`/boards/${board.id}/tasks/${task.id}/comments/${created.id}`)
      .set("X-User-Id", carol);
    expect(deleteDenied.status).toBe(403);
  });

  it("allows task comment CRUD on a frozen board", async () => {
    const { app, alice, board } = await setupBoard();
    const task = await createTask(app, board.id, alice, "Task");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "Blocked" });

    const created = await request(app)
      .post(`/boards/${board.id}/tasks/${task.id}/comments`)
      .set("X-User-Id", alice)
      .send({ text: "Frozen note" });
    expect(created.status).toBe(201);

    const edited = await request(app)
      .patch(`/boards/${board.id}/tasks/${task.id}/comments/${created.body.id}`)
      .set("X-User-Id", alice)
      .send({ text: "Edited frozen" });
    expect(edited.status).toBe(200);

    const removed = await request(app)
      .delete(`/boards/${board.id}/tasks/${task.id}/comments/${created.body.id}`)
      .set("X-User-Id", alice);
    expect(removed.status).toBe(200);
  });
})