import { randomUUID } from "node:crypto";
import { Request, Router } from "express";
import { allowedTaskTransitions } from "../domain/guards";
import { isStoryPoints, isTaskPriority } from "../domain/entities";
import { createTask, deleteTask, editTask, moveTask, reassignTaskOwner } from "../domain/commands";
import { BoardRepository } from "../repositories";
import { ApiError } from "../middleware/errorHandler";
import { assertBoardMember, parseLifecycleState, requireActor, requireBoard, requireTask } from "./helpers";

function boardIdOf(req: Request): string {
  return (req.params as { boardId: string }).boardId;
}

export function createTasksRouter(boardRepo: BoardRepository): Router {
  const router = Router({ mergeParams: true });

  router.get("/", async (req, res) => {
    const board = await requireBoard(boardRepo, boardIdOf(req));
    assertBoardMember(board, requireActor(req));
    res.json(board.tasks);
  });

  router.post("/", async (req, res) => {
    const board = await requireBoard(boardRepo, boardIdOf(req));
    assertBoardMember(board, requireActor(req));
    const title = req.body?.title;
    if (typeof title !== "string" || title.trim().length === 0) {
      throw new ApiError("validation", "title is required");
    }
    const description =
      typeof req.body?.description === "string" ? req.body.description : undefined;
    const priority = req.body?.priority;
    if (priority !== undefined && !isTaskPriority(priority)) {
      throw new ApiError("validation", "priority must be low, medium, high, or urgent");
    }
    const storyPoints = req.body?.storyPoints;
    if (storyPoints !== undefined && storyPoints !== null && !isStoryPoints(storyPoints)) {
      throw new ApiError("validation", "story points must be 1, 2, 3, 5, 8, or 13");
    }
    const task = createTask(board, requireActor(req), {
      id: randomUUID(),
      title: title.trim(),
      description,
      priority,
      storyPoints,
    });
    await boardRepo.saveBoardAggregate(board);
    res.status(201).json(task);
  });

  router.get("/:taskId", async (req, res) => {
    const board = await requireBoard(boardRepo, boardIdOf(req));
    assertBoardMember(board, requireActor(req));
    res.json(requireTask(board, req.params.taskId));
  });

  router.patch("/:taskId", async (req, res) => {
    const board = await requireBoard(boardRepo, boardIdOf(req));
    assertBoardMember(board, requireActor(req));
    const task = requireTask(board, req.params.taskId);
    const patch: {
      title?: string;
      description?: string;
      priority?: unknown;
      storyPoints?: unknown;
    } = {};
    if (typeof req.body?.title === "string") {
      const title = req.body.title.trim();
      if (title.length === 0) {
        throw new ApiError("validation", "title is required");
      }
      patch.title = title;
    }
    if (typeof req.body?.description === "string") patch.description = req.body.description;
    if (req.body?.priority !== undefined) {
      if (!isTaskPriority(req.body.priority)) {
        throw new ApiError("validation", "priority must be low, medium, high, or urgent");
      }
      patch.priority = req.body.priority;
    }
    if (req.body?.storyPoints !== undefined) {
      if (req.body.storyPoints !== null && !isStoryPoints(req.body.storyPoints)) {
        throw new ApiError("validation", "story points must be 1, 2, 3, 5, 8, or 13");
      }
      patch.storyPoints = req.body.storyPoints;
    }
    editTask(board, requireActor(req), task.id, patch);
    await boardRepo.saveBoardAggregate(board);
    res.json(task);
  });

  router.post("/:taskId/state", async (req, res) => {
    const board = await requireBoard(boardRepo, boardIdOf(req));
    assertBoardMember(board, requireActor(req));
    const task = requireTask(board, req.params.taskId);
    const target = parseLifecycleState(req.body?.target);
    moveTask(board, requireActor(req), task.id, target);
    await boardRepo.saveBoardAggregate(board);
    res.json(task);
  });

  router.post("/:taskId/owner", async (req, res) => {
    const board = await requireBoard(boardRepo, boardIdOf(req));
    assertBoardMember(board, requireActor(req));
    const task = requireTask(board, req.params.taskId);
    const owner = req.body?.owner;
    if (typeof owner !== "string" || owner.length === 0) {
      throw new ApiError("validation", "owner is required");
    }
    reassignTaskOwner(board, requireActor(req), task.id, owner);
    await boardRepo.saveBoardAggregate(board);
    res.json(task);
  });

  router.delete("/:taskId", async (req, res) => {
    const board = await requireBoard(boardRepo, boardIdOf(req));
    assertBoardMember(board, requireActor(req));
    const task = requireTask(board, req.params.taskId);
    deleteTask(board, requireActor(req), task.id);
    await boardRepo.saveBoardAggregate(board);
    res.json({});
  });

  router.get("/:taskId/actions", async (req, res) => {
    const board = await requireBoard(boardRepo, boardIdOf(req));
    assertBoardMember(board, requireActor(req));
    const task = requireTask(board, req.params.taskId);
    res.json(allowedTaskTransitions(board, task));
  });

  return router;
}