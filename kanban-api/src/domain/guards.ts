import { LifecycleState } from "./entities";
import type { Board, Task } from "./entities";
import { isTerminal, allowedTransitions } from "./lifecycle";

const FREEZING_BOARD_STATES: ReadonlySet<LifecycleState> = new Set([
  LifecycleState.Blocked,
  LifecycleState.Cancelled,
  LifecycleState.Done,
]);

export const FROZEN_BOARD_STATES: ReadonlyArray<LifecycleState> = [
  LifecycleState.Blocked,
  LifecycleState.Cancelled,
  LifecycleState.Done,
];

export function isBoardFrozen(board: Board): boolean {
  return FREEZING_BOARD_STATES.has(board.state);
}

export function isEditable(board: Board, task: Task): boolean {
  return !isBoardFrozen(board) && !isTerminal(task.state);
}

export function boardCanBeDone(board: Board): boolean {
  return board.tasks.every(
    (task) =>
      task.state === LifecycleState.Done || task.state === LifecycleState.Cancelled,
  );
}

export function allowedTaskTransitions(board: Board, task: Task): LifecycleState[] {
  if (board.state !== LifecycleState.InProgress) return [];
  if (!isEditable(board, task)) return [];
  return allowedTransitions(task);
}

export function allowedBoardTransitions(board: Board): LifecycleState[] {
  if (isTerminal(board.state)) return [];
  return allowedTransitions(board).filter(
    (to) => !(to === LifecycleState.Done && !boardCanBeDone(board)),
  );
}