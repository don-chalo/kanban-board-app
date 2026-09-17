import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { BoardModel, TaskModel, UserModel } from "./index";

describe("models", () => {
  let server: MongoMemoryServer;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    await mongoose.connect(server.getUri("todo-list"));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await server.stop();
  });

  it("round-trips a user with its string _id", async () => {
    await UserModel.create({ _id: "user-1", email: "alice@example.com" });
    const found = await UserModel.findById("user-1");
    expect(found?.toObject()).toMatchObject({ _id: "user-1", email: "alice@example.com" });
  });

  it("enforces a unique index on the user email", async () => {
    await UserModel.init();
    const indexes = UserModel.schema.indexes();
    const emailIndex = indexes.find(([fields]) => "email" in fields);
    expect(emailIndex).toBeDefined();
    expect(emailIndex![1].unique).toBe(true);

    await UserModel.create({ _id: "user-u1", email: "dup@example.com" });
    await expect(UserModel.create({ _id: "user-u2", email: "dup@example.com" })).rejects.toThrow();
  });

  it("round-trips a board with membership fields and indexes", async () => {
    const board = await BoardModel.create({
      _id: "board-1",
      title: "Docs",
      description: "",
      creator: "user-1",
      owner: "user-1",
      associated: ["user-2", "user-3"],
      state: "ToDo",
      previousState: null,
    });
    const found = await BoardModel.findById("board-1").lean();
    expect(found).toMatchObject({
      _id: "board-1",
      creator: "user-1",
      owner: "user-1",
      associated: ["user-2", "user-3"],
    });
    const byOwner = await BoardModel.find({ owner: "user-1" });
    expect(byOwner).toHaveLength(1);
    const byAssociated = await BoardModel.find({ associated: "user-2" });
    expect(byAssociated).toHaveLength(1);
    expect(board.title).toBe("Docs");
  });

  it("round-trips a task and indexes by boardId", async () => {
    await TaskModel.create({
      _id: "task-1",
      boardId: "board-1",
      creator: "user-1",
      owner: "user-2",
      title: "Write docs",
      description: "Task details",
      state: "InProgress",
      previousState: "ToDo",
    });
    const tasks = await TaskModel.find({ boardId: "board-1" });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].toObject()).toMatchObject({
      _id: "task-1",
      title: "Write docs",
      state: "InProgress",
      previousState: "ToDo",
      owner: "user-2",
    });
  });
});