import type { Board, Task, UserId } from "./entities";
import { resolveRole } from "./roles";

export enum Action {
  ViewBoard,
  ViewTask,
  CreateTask,
  EditTask,
  MoveTask,
  DeleteTask,
  ReassignTaskOwner,
  ManageBoard,
}

export function authorize(
  action: Action,
  board: Board,
  task: Task | null,
  actor: UserId,
): boolean {
  const role = resolveRole(board, actor);
  if (role === "none") return false;

  const isManager = role === "creator" || role === "owner";

  switch (action) {
    case Action.EditTask:
    case Action.MoveTask:
      if (isManager) return true;
      return task !== null && task.owner === actor;
    case Action.DeleteTask:
    case Action.ReassignTaskOwner:
    case Action.ManageBoard:
      return isManager;
    case Action.ViewBoard:
    case Action.ViewTask:
    case Action.CreateTask:
      return true;
  }
}