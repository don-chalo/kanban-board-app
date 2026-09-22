import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import net from "node:net";
import request from "supertest";
import { BoardModel, TaskModel, UserModel } from "../models";
import { startTestMongo, stopTestMongo } from "../test/mongo";
import { buildApp } from "../routes/testApp";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as net.AddressInfo;
      server.close((err) => (err ? reject(err) : resolve(address.port)));
    });
  });
}

interface ServerHandle {
  baseUrl: string;
  stop: () => Promise<void>;
}

const START_TIMEOUT_MS = 30000;

async function startServer(mongodbUri: string, port: number): Promise<ServerHandle> {
  const tsxCli = require.resolve("tsx/cli");
  const child = spawn(process.execPath, [tsxCli, "src/index.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: mongodbUri, DEFAULT_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (chunk) => (output += chunk.toString()));
  child.stderr?.on("data", (chunk) => (output += chunk.toString()));

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      child.kill();
      throw new Error(`server exited early:\n${output}`);
    }
    try {
      const res = await request(baseUrl).get("/users/nope");
      if (res.status === 401) {
        return {
          baseUrl,
          stop: () =>
            new Promise<void>((resolve) => {
              if (child.exitCode !== null) return resolve();
              child.once("exit", () => resolve());
              child.kill();
              setTimeout(resolve, 5000);
            }),
        };
      }
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  child.kill();
  throw new Error(`server did not start in time:\n${output}`);
}

describe("http-api e2e scenarios (in-process app)", () => {
  let app: ReturnType<typeof buildApp>;

  async function createUser(email: string): Promise<string> {
    const res = await request(app).post("/login").send({ email });
    return res.body.id;
  }

  async function seedBoard() {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const board = (
      await request(app).post("/boards").set("X-User-Id", alice).send({ title: "Docs" })
    ).body;
    await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: bob });
    const task = (
      await request(app).post(`/boards/${board.id}/tasks`).set("X-User-Id", alice).send({ title: "Write spec" })
    ).body;
    return { alice, bob, board, task };
  }

  beforeAll(async () => {
    await startTestMongo();
    app = buildApp();
  });

  afterEach(async () => {
    await Promise.all([UserModel.deleteMany({}), BoardModel.deleteMany({}), TaskModel.deleteMany({})]);
  });

  afterAll(stopTestMongo);

  it("actor identity: known actor is accepted, unknown actor is rejected", async () => {
    const { alice, board } = await seedBoard();
    const known = await request(app).get(`/boards/${board.id}`).set("X-User-Id", alice);
    expect(known.status).toBe(200);
    const unknown = await request(app).get("/boards").set("X-User-Id", "user-ghost");
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe("unknown_actor");
  });

  it("user identity: created with a stable id and retrievable", async () => {
    const created = await request(app).post("/login").send({ email: "carol@example.com" });
    expect(created.status).toBe(200);
    expect(created.body.email).toBe("carol@example.com");
    const retrieved = await request(app).get(`/users/${created.body.id}`).set("X-User-Id", created.body.id);
    expect(retrieved.status).toBe(200);
    expect(retrieved.body).toEqual(created.body);
  });

  it("board creation and membership-scoped listing", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const board = (
      await request(app).post("/boards").set("X-User-Id", alice).send({ title: "Shared" })
    ).body;
    await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: bob });

    const created = await request(app).post("/boards").set("X-User-Id", alice).send({ title: "Private" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ creator: alice, owner: alice, state: "ToDo", associated: [] });

    const bobList = await request(app).get("/boards").set("X-User-Id", bob);
    expect(bobList.body.map((b: { id: string }) => b.id)).toEqual([board.id]);
    expect(bobList.body.every((b: { tasks: unknown[] }) => b.tasks.length === 0)).toBe(true);
  });

  it("board detail: member views it, non-member is denied", async () => {
    const { alice, bob, board, task } = await seedBoard();
    const detail = await request(app).get(`/boards/${board.id}`).set("X-User-Id", bob);
    expect(detail.status).toBe(200);
    expect(detail.body.tasks.map((t: { id: string }) => t.id)).toContain(task.id);
    const outsider = await createUser("outsider@example.com");
    const denied = await request(app).get(`/boards/${board.id}`).set("X-User-Id", outsider);
    expect(denied.status).toBe(403);
  });

  it("board attributes and ownership are updated", async () => {
    const { alice, bob, board } = await seedBoard();
    const updated = await request(app)
      .patch(`/boards/${board.id}`)
      .set("X-User-Id", alice)
      .send({ title: "Docs 2", description: "Team board" });
    expect(updated.body).toMatchObject({ title: "Docs 2", description: "Team board", owner: alice });

    const transferred = await request(app)
      .patch(`/boards/${board.id}`)
      .set("X-User-Id", alice)
      .send({ owner: bob });
    expect(transferred.body.owner).toBe(bob);
    expect(transferred.body.associated).not.toContain(bob);
  });

  it("board lifecycle: state changes and the Done gate rejects live tasks", async () => {
    const { alice, board } = await seedBoard();
    const moved = await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    expect(moved.body.state).toBe("InProgress");
    const rejected = await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "Done" });
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe("board_not_done");
  });

  it("membership: member added then removed", async () => {
    const { alice, board } = await seedBoard();
    const carol = await createUser("carol@example.com");
    const added = await request(app).post(`/boards/${board.id}/members`).set("X-User-Id", alice).send({ member: carol });
    expect(added.body.associated).toContain(carol);
    const removed = await request(app).delete(`/boards/${board.id}/members/${carol}`).set("X-User-Id", alice);
    expect(removed.body.associated).not.toContain(carol);
  });

  it("task create/read/edit/delete with role rules", async () => {
    const { alice, bob, board } = await seedBoard();
    const created = await request(app).post(`/boards/${board.id}/tasks`).set("X-User-Id", bob).send({ title: "Bob's task" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ owner: bob, creator: bob, state: "ToDo" });

    const edited = await request(app)
      .patch(`/boards/${board.id}/tasks/${created.body.id}`)
      .set("X-User-Id", bob)
      .send({ title: "Renamed by owner" });
    expect(edited.body.title).toBe("Renamed by owner");

    const denied = await request(app).delete(`/boards/${board.id}/tasks/${created.body.id}`).set("X-User-Id", bob);
    expect(denied.status).toBe(403);

    const deleted = await request(app).delete(`/boards/${board.id}/tasks/${created.body.id}`).set("X-User-Id", alice);
    expect(deleted.status).toBe(200);
    const gone = await request(app).get(`/boards/${board.id}/tasks/${created.body.id}`).set("X-User-Id", alice);
    expect(gone.status).toBe(404);
  });

  it("task lifecycle and ownership", async () => {
    const { alice, bob, board, task } = await seedBoard();
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    const moved = await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    expect(moved.body.state).toBe("InProgress");
    const blocked = await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "Blocked" });
    expect(blocked.body.previousState).toBe("InProgress");
    const unblocked = await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    expect(unblocked.body.previousState).toBeNull();

    const reassigned = await request(app).post(`/boards/${board.id}/tasks/${task.id}/owner`).set("X-User-Id", alice).send({ owner: bob });
    expect(reassigned.body.owner).toBe(bob);

    const rejected = await request(app).post(`/boards/${board.id}/tasks/${task.id}/owner`).set("X-User-Id", alice).send({ owner: "user-outsider" });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe("member_required");
  });

  it("next-actions: live task lists states, terminal task is empty", async () => {
    const { alice, bob, board, task } = await seedBoard();
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    const actions = await request(app).get(`/boards/${board.id}/tasks/${task.id}/actions`).set("X-User-Id", bob);
    expect(actions.status).toBe(200);
    expect(actions.body).toEqual(["InProgress", "Cancelled"]);

    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "Cancelled" });

    const empty = await request(app).get(`/boards/${board.id}/tasks/${task.id}/actions`).set("X-User-Id", bob);
    expect(empty.body).toEqual([]);
  });

  it("error contract: uniform error bodies with status and code", async () => {
    const { alice, bob, board, task } = await seedBoard();
    await request(app).post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
    const conflict = await request(app).post(`/boards/${board.id}/tasks/${task.id}/state`).set("X-User-Id", alice).send({ target: "ToDo" });
    expect(conflict.status).toBe(409);
    expect(Object.keys(conflict.body)).toEqual(["error"]);
    expect(conflict.body.error.code).toBe("invalid_transition");
    expect(conflict.body.error.message).toBeTruthy();

    const forbidden = await request(app).delete(`/boards/${board.id}/tasks/${task.id}`).set("X-User-Id", bob);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("unauthorized");

    const missing = await request(app).get(`/boards/${board.id}/tasks/nope`).set("X-User-Id", alice);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("not_found");
  });
});

describe("durable persistence across a server restart", () => {
  it(
    "boards, tasks, and identities survive a restart and a deleted task stays deleted",
    async () => {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongo = await MongoMemoryServer.create();
      const uri = mongo.getUri("todo-list");
      const port = await freePort();

      let server = await startServer(uri, port);
      const agent = request(server.baseUrl);

      const alice = (await agent.post("/login").send({ email: "alice@example.com" })).body.id;
      const board = (await agent.post("/boards").set("X-User-Id", alice).send({ title: "Docs" })).body;
      const keep = (await agent.post(`/boards/${board.id}/tasks`).set("X-User-Id", alice).send({ title: "Keep" })).body;
      const drop = (await agent.post(`/boards/${board.id}/tasks`).set("X-User-Id", alice).send({ title: "Drop" })).body;
      await agent.post(`/boards/${board.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
      await agent.post(`/boards/${board.id}/tasks/${keep.id}/state`).set("X-User-Id", alice).send({ target: "InProgress" });
      await agent.delete(`/boards/${board.id}/tasks/${drop.id}`).set("X-User-Id", alice);
      await server.stop();

      server = await startServer(uri, port);
      const again = request(server.baseUrl);

      const user = await again.get(`/users/${alice}`).set("X-User-Id", alice);
      expect(user.body.email).toBe("alice@example.com");

      const detail = await again.get(`/boards/${board.id}`).set("X-User-Id", alice);
      expect(detail.status).toBe(200);
      expect(detail.body.state).toBe("InProgress");
      expect(
        detail.body.tasks.map((t: { id: string; state: string }) => ({ id: t.id, state: t.state })),
      ).toEqual([{ id: keep.id, state: "InProgress" }]);

      const deleted = await again.get(`/boards/${board.id}/tasks/${drop.id}`).set("X-User-Id", alice);
      expect(deleted.status).toBe(404);
      const list = await again.get(`/boards/${board.id}/tasks`).set("X-User-Id", alice);
      expect(list.body.map((t: { id: string }) => t.id)).toEqual([keep.id]);

      const boardActions = await again.get(`/boards/${board.id}/actions`).set("X-User-Id", alice);
      expect(boardActions.body).toEqual(["Blocked", "Cancelled"]);

      await server.stop();
      await mongo.stop();
    },
    120000,
  );
})