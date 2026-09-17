import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { BoardModel, TaskModel, UserModel } from "../models";
import { startTestMongo, stopTestMongo } from "../test/mongo";
import { buildApp } from "./testApp";

type Agent = ReturnType<typeof request>;

async function createUser(app: Agent, email: string): Promise<string> {
  const res = await app.post("/login").send({ email });
  return res.body.id;
}

async function createBoard(app: Agent, actorId: string, title: string) {
  const res = await app.post("/boards").set("X-User-Id", actorId).send({ title });
  return res.body;
}

describe("boards router", () => {
  beforeAll(startTestMongo);
  afterAll(stopTestMongo);

  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      BoardModel.deleteMany({}),
      TaskModel.deleteMany({}),
    ]);
  });

  it("creates a board with the actor as Creator and Owner, state To Do", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const res = await request(app).post("/boards").set("X-User-Id", alice).send({ title: "Docs" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      creator: alice,
      owner: alice,
      associated: [],
      state: "ToDo",
      tasks: [],
    });
    expect(res.body.title).toBe("Docs");
  });

  it("rejects board creation without a title", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const res = await request(app).post("/boards").set("X-User-Id", alice).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("unknown actor gets 401", async () => {
    const res = await request(buildApp()).get("/boards").set("X-User-Id", "user-ghost");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unknown_actor");
  });

  it("lists only the boards the actor is a member of, without task payloads", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const bob = await createUser(request(app), "bob@example.com");

    const boardA = await createBoard(request(app), alice, "A");
    const boardB = await createBoard(request(app), alice, "B");
    await request(app).post(`/boards/${boardA.id}/tasks`).set("X-User-Id", alice).send({ title: "t" });

    expect((await request(app).get("/boards").set("X-User-Id", bob)).body).toEqual([]);
    const listRes = await request(app).get("/boards").set("X-User-Id", alice);
    expect(listRes.status).toBe(200);
    expect(listRes.body.map((b: { id: string }) => b.id).sort()).toEqual(
      [boardA.id, boardB.id].sort(),
    );
    expect(listRes.body.every((b: { tasks: unknown[] }) => b.tasks.length === 0)).toBe(true);
  });

  it("member views the board with its tasks and members", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const bob = await createUser(request(app), "bob@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: bob });
    const task = (
      await request(app).post(`/boards/${board.id}/tasks`).set("X-User-Id", alice).send({ title: "t" })
    ).body;

    const res = await request(app).get(`/boards/${board.id}`).set("X-User-Id", alice);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: board.id, state: "ToDo", associated: [bob] });
    expect(res.body.tasks).toEqual([expect.objectContaining({ id: task.id, title: "t" })]);
  });

  it("denies a non-member access to board detail", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const bob = await createUser(request(app), "bob@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    const res = await request(app).get(`/boards/${board.id}`).set("X-User-Id", bob);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("returns 404 for a missing board", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const res = await request(app).get("/boards/nope").set("X-User-Id", alice);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("updates the title and description", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    const res = await request(app)
      .patch(`/boards/${board.id}`)
      .set("X-User-Id", alice)
      .send({ title: "Renamed", description: "Notes" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: "Renamed", description: "Notes" });
  });

  it("rejects a blank board title and leaves the board unchanged", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    const res = await request(app)
      .patch(`/boards/${board.id}`)
      .set("X-User-Id", alice)
      .send({ title: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
    const fetched = await request(app).get(`/boards/${board.id}`).set("X-User-Id", alice);
    expect(fetched.body.title).toBe("Docs");
  });

  it("trims a padded board title", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    const res = await request(app)
      .patch(`/boards/${board.id}`)
      .set("X-User-Id", alice)
      .send({ title: "  Spaced  " });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Spaced");
  });

  it("reassigns board ownership to a member", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const bob = await createUser(request(app), "bob@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: bob });

    const res = await request(app)
      .patch(`/boards/${board.id}`)
      .set("X-User-Id", alice)
      .send({ owner: bob });
    expect(res.status).toBe(200);
    expect(res.body.owner).toBe(bob);
    expect(res.body.creator).toBe(alice);
    expect(res.body.associated).not.toContain(bob);
  });

  it("rejects owner reassignment to a non-member", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    const res = await request(app)
      .patch(`/boards/${board.id}`)
      .set("X-User-Id", alice)
      .send({ owner: "user-outsider" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("member_required");
  });

  it("rejects attribute edits from an associated member", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const bob = await createUser(request(app), "bob@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: bob });
    const res = await request(app)
      .patch(`/boards/${board.id}`)
      .set("X-User-Id", bob)
      .send({ title: "x" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("unauthorized");
  });

  it("changes the board state and unblocks to the previous state", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");

    const inProgress = await request(app)
      .post(`/boards/${board.id}/state`)
      .set("X-User-Id", alice)
      .send({ target: "InProgress" });
    expect(inProgress.status).toBe(200);
    expect(inProgress.body.state).toBe("InProgress");

    const blocked = await request(app)
      .post(`/boards/${board.id}/state`)
      .set("X-User-Id", alice)
      .send({ target: "Blocked" });
    expect(blocked.body.state).toBe("Blocked");

    const unblocked = await request(app)
      .post(`/boards/${board.id}/state`)
      .set("X-User-Id", alice)
      .send({ target: "InProgress" });
    expect(unblocked.body.state).toBe("InProgress");
  });

  it("rejects an invalid target state", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    const res = await request(app)
      .post(`/boards/${board.id}/state`)
      .set("X-User-Id", alice)
      .send({ target: "Nope" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation");
  });

  it("adds and removes an associated member", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const bob = await createUser(request(app), "bob@example.com");
    const board = await createBoard(request(app), alice, "Docs");

    const added = await request(app)
      .post(`/boards/${board.id}/members`)
      .set("X-User-Id", alice)
      .send({ member: bob });
    expect(added.body.associated).toContain(bob);
    expect((await request(app).get("/boards").set("X-User-Id", bob)).body.map((b: { id: string }) => b.id)).toContain(board.id);

    const dup = await request(app)
      .post(`/boards/${board.id}/members`)
      .set("X-User-Id", alice)
      .send({ member: bob });
    expect(dup.status).toBe(400);
    expect(dup.body.error.code).toBe("duplicate_member");

    const removed = await request(app)
      .delete(`/boards/${board.id}/members/${bob}`)
      .set("X-User-Id", alice);
    expect(removed.body.associated).not.toContain(bob);
    expect((await request(app).get("/boards").set("X-User-Id", bob)).body).toEqual([]);
  });

  it("rejects adding a member on a frozen board", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const bob = await createUser(request(app), "bob@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "Blocked" });
    const res = await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: bob });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("read_only");
  });

  it("rejects adding a member on terminal boards", async () => {
    for (const state of ["Done", "Cancelled"] as const) {
      const app = buildApp();
      const alice = await createUser(request(app), "alice@example.com");
      const bob = await createUser(request(app), "bob@example.com");
      const board = await createBoard(request(app), alice, "Docs");
      const task = (await request(app).post(`/boards/${board.id}/tasks`).set("X-User-Id", alice).send({ title: "t" })).body;
      await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
      await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: state });
      await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
      await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: state });
      const res = await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: bob });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("read_only");
    }
  });

  it("rejects updating title on a frozen board but allows description", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "Blocked" });
    const titleRes = await request(app).patch(`/boards/${board.id}`).set("X-User-Id", alice).send({ title: "X" });
    expect(titleRes.status).toBe(409);
    expect(titleRes.body.error.code).toBe("read_only");
    const descRes = await request(app).patch(`/boards/${board.id}`).set("X-User-Id", alice).send({ description: "notes" });
    expect(descRes.status).toBe(200);
    expect(descRes.body.description).toBe("notes");
  });

  it("rejects updating title on terminal boards but allows description", async () => {
    for (const state of ["Done", "Cancelled"] as const) {
      const app = buildApp();
      const alice = await createUser(request(app), "alice@example.com");
      const board = await createBoard(request(app), alice, "Docs");
      const task = (await request(app).post(`/boards/${board.id}/tasks`).set("X-User-Id", alice).send({ title: "t" })).body;
      await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
      await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: state });
      await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
      await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: state });
      const titleRes = await request(app).patch(`/boards/${board.id}`).set("X-User-Id", alice).send({ title: "X" });
      expect(titleRes.status).toBe(409);
      expect(titleRes.body.error.code).toBe("read_only");
      const descRes = await request(app).patch(`/boards/${board.id}`).set("X-User-Id", alice).send({ description: `desc-${state}` });
      expect(descRes.status).toBe(200);
      expect(descRes.body.description).toBe(`desc-${state}`);
    }
  });

  it("rejects mixed title and description update atomically on a frozen board", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "Blocked" });
    const res = await request(app).patch(`/boards/${board.id}`).set("X-User-Id", alice).send({ title: "X", description: "Y" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("read_only");
    const fetched = await request(app).get(`/boards/${board.id}`).set("X-User-Id", alice);
    expect(fetched.body.title).toBe("Docs");
    expect(fetched.body.description).toBe("");
  });

  it("returns next-actions excluding Done while a live task remains", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    await request(app).post(`/boards/${board.id}/tasks`).set("X-User-Id", alice).send({ title: "t" });

    const res = await request(app).get(`/boards/${board.id}/actions`).set("X-User-Id", alice);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["InProgress", "Cancelled"]);
  });

  it("includes Done in next-actions when the Done gate passes", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    const task = (await request(app).post(`/boards/${board.id}/tasks`).set("X-User-Id", alice).send({ title: "t" })).body;
    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "Done" });
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });

    const res = await request(app).get(`/boards/${board.id}/actions`).set("X-User-Id", alice);
    expect(res.body).toEqual(["Done", "Blocked", "Cancelled"]);
  });

  it("returns empty next-actions for a terminal board", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "Cancelled" });
    const res = await request(app).get(`/boards/${board.id}/actions`).set("X-User-Id", alice);
    expect(res.body).toEqual([]);
  });

  it("denies next-actions to a non-member", async () => {
    const app = buildApp();
    const alice = await createUser(request(app), "alice@example.com");
    const bob = await createUser(request(app), "bob@example.com");
    const board = await createBoard(request(app), alice, "Docs");
    const res = await request(app).get(`/boards/${board.id}/actions`).set("X-User-Id", bob);
    expect(res.status).toBe(403);
  });
})