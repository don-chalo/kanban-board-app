import type { Board, Task, UserId } from "./entities";
import { resolveRole } from "./roles";

export function canView(board: Board, userId: UserId): boolean {
  return resolveRole(board, userId) !== "none";
}

export function canViewTask(board: Board, userId: UserId): boolean {
  return resolveRole(board, userId) !== "none";
}