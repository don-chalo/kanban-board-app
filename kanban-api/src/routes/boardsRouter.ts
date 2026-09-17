import { randomUUID } from "node:crypto";
import { Router } from "express";
import { createBoard, manageBoard, moveBoard, reassignBoardOwner } from "../domain/commands";
import { allowedBoardTransitions } from "../domain/guards";
import { BoardRepository, UserRepository } from "../repositories";
import { createActorMiddleware } from "../middleware/actor";
import { ApiError } from "../middleware/errorHandler";
import { assertBoardMember, parseLifecycleState, requireActor, requireBoard } from "./helpers";
import { createTasksRouter } from "./tasksRouter";

export function createBoardsRouter(
  userRepo: UserRepository,
  boardRepo: BoardRepository,
): Router {
  const router = Router();

  router.use(createActorMiddleware(userRepo));

  router.get("/boards", async (req, res) => {
    const boards = await boardRepo.listBoardsForMember(requireActor(req));
    res.json(boards);
  });

  router.post("/boards", async (req, res) => {
    const title = req.body?.title;
    if (typeof title !== "string" || title.trim().length === 0) {
      throw new ApiError("validation", "title is required");
    }
    const board = createBoard(requireActor(req), { id: randomUUID(), title: title.trim() });
    await boardRepo.saveBoardAggregate(board);
    res.status(201).json(board);
  });

  router.get("/boards/:boardId", async (req, res) => {
    const board = await requireBoard(boardRepo, req.params.boardId);
    assertBoardMember(board, requireActor(req));
    res.json(board);
  });

  router.patch("/boards/:boardId", async (req, res) => {
    const board = await requireBoard(boardRepo, req.params.boardId);
    assertBoardMember(board, requireActor(req));
    const actor = requireActor(req);
    const body = req.body ?? {};
    let title: string | undefined;
    if (typeof body.title === "string") {
      title = body.title.trim();
      if (title.length === 0) {
        throw new ApiError("validation", "title is required");
      }
    }
    if (title !== undefined || typeof body.description === "string") {
      manageBoard(board, actor, {
        kind: "editAttributes",
        title,
        description: typeof body.description === "string" ? body.description : undefined,
      });
    }
    if (body.owner !== undefined) {
      if (typeof body.owner !== "string" || body.owner.length === 0) {
        throw new ApiError("validation", "owner must be a non-empty string");
      }
      reassignBoardOwner(board, actor, body.owner);
    }
    await boardRepo.saveBoardAggregate(board);
    res.json(board);
  });

  router.post("/boards/:boardId/state", async (req, res) => {
    const board = await requireBoard(boardRepo, req.params.boardId);
    assertBoardMember(board, requireActor(req));
    const target = parseLifecycleState(req.body?.target);
    moveBoard(board, requireActor(req), target);
    await boardRepo.saveBoardAggregate(board);
    res.json(board);
  });

  router.post("/boards/:boardId/members", async (req, res) => {
    const board = await requireBoard(boardRepo, req.params.boardId);
    assertBoardMember(board, requireActor(req));
    const member = req.body?.member;
    if (typeof member !== "string" || member.length === 0) {
      throw new ApiError("validation", "member is required");
    }
    manageBoard(board, requireActor(req), { kind: "addMember", member });
    await boardRepo.saveBoardAggregate(board);
    res.json(board);
  });

  router.delete("/boards/:boardId/members/:userId", async (req, res) => {
    const board = await requireBoard(boardRepo, req.params.boardId);
    assertBoardMember(board, requireActor(req));
    manageBoard(board, requireActor(req), {
      kind: "removeMember",
      member: req.params.userId,
    });
    await boardRepo.saveBoardAggregate(board);
    res.json(board);
  });

  router.get("/boards/:boardId/actions", async (req, res) => {
    const board = await requireBoard(boardRepo, req.params.boardId);
    assertBoardMember(board, requireActor(req));
    res.json(allowedBoardTransitions(board));
  });

  router.use("/boards/:boardId/tasks", createTasksRouter(boardRepo));

  return router;
}