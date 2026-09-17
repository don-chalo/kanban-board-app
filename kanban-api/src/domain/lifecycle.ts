import { LifecycleState } from "./entities";

export const ALL_LIFECYCLE_STATES: ReadonlyArray<LifecycleState> = [
  LifecycleState.ToDo,
  LifecycleState.InProgress,
  LifecycleState.Done,
  LifecycleState.Blocked,
  LifecycleState.Cancelled,
];

export const TERMINAL_STATES: ReadonlySet<LifecycleState> = new Set([
  LifecycleState.Done,
  LifecycleState.Cancelled,
]);

export function allowedTransitions(entity: {
  state: LifecycleState;
  previousState: LifecycleState | null;
}): LifecycleState[] {
  return ALL_LIFECYCLE_STATES.filter((to) =>
    canTransition(entity.state, to, entity.previousState),
  );
}

export function isTerminal(state: LifecycleState): boolean {
  return TERMINAL_STATES.has(state);
}

export function canTransition(
  from: LifecycleState,
  to: LifecycleState,
  previousState: LifecycleState | null,
): boolean {
  switch (from) {
    case LifecycleState.ToDo:
      return to === LifecycleState.InProgress || to === LifecycleState.Cancelled;
    case LifecycleState.InProgress:
      return (
        to === LifecycleState.Done ||
        to === LifecycleState.Blocked ||
        to === LifecycleState.Cancelled
      );
    case LifecycleState.Blocked:
      return to === LifecycleState.InProgress && previousState === LifecycleState.InProgress;
    default:
      return false;
  }
}