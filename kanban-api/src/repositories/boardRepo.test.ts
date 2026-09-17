import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LifecycleState } from "../domain/entities";
import {
  createBoard,
  createTask,
  deleteTask,
  editTask,
  manageBoard,
  reassignBoardOwner,
} from "../domain/commands";
import { alice, bob } from "../domain/fixtures";
import { BoardModel, TaskModel } from "../models";
import { startTestMongo, stopTestMongo } from "../test/mongo";
import { createMongoBoardRepository } from "./boardRepo";

describe("boardRepo", () => {
  let repo: ReturnType<typeof createMongoBoardRepository>;

  beforeAll(async () => {
    await startTestMongo();
    repo = createMongoBoardRepository();
  });

  afterAll(stopTestMongo);

  beforeEach(async () => {
    await Promise.all([BoardModel.deleteMany({}), TaskModel.deleteMany({})]);
  });

  describe("loadBoardAggregate", () => {
    it("hydrates a board together with its tasks", async () => {
      const board = createBoard(alice, { id: "b-aggr", title: "Agg" });
      createTask(board, alice, { id: "t-aggr-1", title: "One" });
      manageBoard(board, alice, { kind: "addMember", member: bob });
      createTask(board, bob, { id: "t-aggr-2", title: "Two" });
      await repo.saveBoardAggregate(board);

      const loaded = await repo.loadBoardAggregate("b-aggr");
      expect(loaded).not.toBeNull();
      expect(loaded!.title).toBe("Agg");
      expect(loaded!.creator).toBe(alice);
      expect(loaded!.tasks.map((t) => t.id).sort()).toEqual(["t-aggr-1", "t-aggr-2"]);
      const loadedTask = loaded!.tasks.find((t) => t.id === "t-aggr-2")!;
      expect(loadedTask.owner).toBe(bob);
      expect(loadedTask.state).toBe(LifecycleState.ToDo);
    });

    it("returns null for a missing board", async () => {
      expect(await repo.loadBoardAggregate("b-missing")).toBeNull();
    });
  });

  describe("listBoardsForMember", () => {
    it("returns only boards the user is a member of, without task payloads", async () => {
      const asCreator = createBoard(alice, { id: "b-creator", title: "Creator" });
      createTask(asCreator, alice, { id: "t-creator", title: "Task" });
      await repo.saveBoardAggregate(asCreator);

      const asOwner = createBoard(bob, { id: "b-owner", title: "Owner" });
      manageBoard(asOwner, bob, { kind: "addMember", member: alice });
      reassignBoardOwner(asOwner, bob, alice);
      await repo.saveBoardAggregate(asOwner);

      const asAssociated = createBoard(bob, { id: "b-assoc", title: "Assoc" });
      manageBoard(asAssociated, bob, { kind: "addMember", member: alice });
      await repo.saveBoardAggregate(asAssociated);

      const foreign = createBoard(bob, { id: "b-foreign", title: "Foreign" });
      await repo.saveBoardAggregate(foreign);

      const list = await repo.listBoardsForMember(alice);
      expect(list.map((b) => b.id).sort()).toEqual(["b-assoc", "b-creator", "b-owner"]);
      expect(list.every((b) => b.tasks.length === 0)).toBe(true);
    });
  });

  describe("saveBoardAggregate task diff", () => {
    it("inserts a new board and its tasks", async () => {
      const board = createBoard(alice, { id: "b-insert", title: "Ins" });
      createTask(board, alice, { id: "t-insert", title: "T" });
      await repo.saveBoardAggregate(board);

      expect(await BoardModel.countDocuments()).toBe(1);
      expect(await TaskModel.countDocuments()).toBe(1);
      expect((await repo.loadBoardAggregate("b-insert"))!.tasks).toHaveLength(1);
    });

    it("updates changed tasks and board attributes", async () => {
      const board = createBoard(alice, { id: "b-update", title: "Orig" });
      createTask(board, alice, { id: "t-update", title: "OrigTitle" });
      await repo.saveBoardAggregate(board);

      const loaded = (await repo.loadBoardAggregate("b-update"))!;
      loaded.title = "Renamed";
      editTask(loaded, alice, "t-update", { title: "NewTitle", description: "Changed" });
      await repo.saveBoardAggregate(loaded);

      const current = (await repo.loadBoardAggregate("b-update"))!;
      expect(current.title).toBe("Renamed");
      expect(current.tasks[0].title).toBe("NewTitle");
      expect(current.tasks[0].description).toBe("Changed");
      expect(await TaskModel.countDocuments()).toBe(1);
    });

    it("deletes tasks absent from the aggregate permanently", async () => {
      const board = createBoard(alice, { id: "b-delete", title: "Del" });
      createTask(board, alice, { id: "t-keep", title: "Keep" });
      createTask(board, alice, { id: "t-remove", title: "Remove" });
      await repo.saveBoardAggregate(board);

      const loaded = (await repo.loadBoardAggregate("b-delete"))!;
      deleteTask(loaded, alice, "t-remove");
      await repo.saveBoardAggregate(loaded);

      const current = (await repo.loadBoardAggregate("b-delete"))!;
      expect(current.tasks.map((t) => t.id)).toEqual(["t-keep"]);
      expect(await TaskModel.findById("t-remove")).toBeNull();
      expect(await TaskModel.countDocuments()).toBe(1);
    });

    it("re-saving an unchanged aggregate is idempotent", async () => {
      const board = createBoard(alice, { id: "b-idem", title: "Idem" });
      createTask(board, alice, { id: "t-idem", title: "T" });
      await repo.saveBoardAggregate(board);
      await repo.saveBoardAggregate(board);

      const current = (await repo.loadBoardAggregate("b-idem"))!;
      expect(current.tasks).toHaveLength(1);
      expect(await BoardModel.countDocuments()).toBe(1);
      expect(await TaskModel.countDocuments()).toBe(1);
    });
  });
});