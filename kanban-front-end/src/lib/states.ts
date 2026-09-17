import { LIFECYCLE_STATES, type LifecycleState } from "./api";

export const COLUMN_ORDER: readonly LifecycleState[] = LIFECYCLE_STATES;

export const STATE_LABELS: Record<LifecycleState, string> = {
  ToDo: "TO DO",
  InProgress: "IN PROGRESS",
  Done: "DONE",
  Blocked: "BLOCKED",
  Cancelled: "CANCELLED",
};

export function emailInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "?";
}