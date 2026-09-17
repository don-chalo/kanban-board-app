import { Request } from "express";
import { Board, LifecycleState, UserId } from "../domain/entities";
import { DomainError } from "../domain/errors";
import { canView } from "../domain/canview";
import { BoardRepository } from "../repositories";
import { ApiError } from "../middleware/errorHandler";

export function requireActor(req: Request): UserId {
  const actor = req.actorId;
  if (!actor) {
    throw new ApiError("unknown_actor", "Missing actor identity");
  }
  return actor;
}

export async function requireBoard(
  boardRepo: BoardRepository,
  boardId: string,
): Promise<Board> {
  const board = await boardRepo.loadBoardAggregate(boardId);
  if (!board) {
    throw new DomainError("not_found", `Board ${boardId} not found`);
  }
  return board;
}

export function assertBoardMember(board: Board, actorId: UserId): void {
  if (!canView(board, actorId)) {
    throw new DomainError("unauthorized", `User ${actorId} is not a member of board ${board.id}`);
  }
}

export function parseLifecycleState(target: unknown): LifecycleState {
  if (typeof target !== "string" || !(Object.values(LifecycleState) as string[]).includes(target)) {
    throw new ApiError("validation", `Invalid lifecycle state: ${String(target)}`);
  }
  return target as LifecycleState;
}

export function requireTask(board: Board, taskId: string) {
  const task = board.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new DomainError("not_found", `Task ${taskId} not found`);
  }
  return task;
}