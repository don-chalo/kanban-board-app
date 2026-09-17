import type { Board, UserId } from "./entities";

export type BoardRole = "creator" | "owner" | "associated" | "none";

export function resolveRole(board: Board, userId: UserId): BoardRole {
  if (board.creator === userId) return "creator";
  if (board.owner === userId) return "owner";
  if (board.associated.includes(userId)) return "associated";
  return "none";
}

export function isMember(board: Board, userId: UserId): boolean {
  return resolveRole(board, userId) !== "none";
}

export function isBoardManager(board: Board, userId: UserId): boolean {
  const role = resolveRole(board, userId);
  return role === "creator" || role === "owner";
}