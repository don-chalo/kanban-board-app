export type UserId = string;
export type BoardId = string;
export type TaskId = string;
export type CommentId = string;

export const MAX_COMMENT_TEXT_LENGTH = 2000;

export interface Comment {
  id: CommentId;
  author: UserId;
  text: string;
  createdAt: string;
}

export interface User {
  id: UserId;
  email: string;
}

export enum LifecycleState {
  ToDo = "ToDo",
  InProgress = "InProgress",
  Done = "Done",
  Blocked = "Blocked",
  Cancelled = "Cancelled",
}

export interface Task {
  id: TaskId;
  boardId: BoardId;
  creator: UserId;
  owner: UserId;
  title: string;
  description: string;
  state: LifecycleState;
  previousState: LifecycleState | null;
  priority: TaskPriority;
  startedAt: string | null;
  storyPoints: StoryPoints | null;
  comments: Comment[];
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    value === "low" || value === "medium" || value === "high" || value === "urgent"
  );
}

export function normalizePriority(value?: unknown): TaskPriority {
  return isTaskPriority(value) ? value : "medium";
}

export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13;

export function isStoryPoints(value: unknown): value is StoryPoints {
  return (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 5 ||
    value === 8 ||
    value === 13
  );
}

export interface Board {
  id: BoardId;
  title: string;
  description: string;
  creator: UserId;
  owner: UserId;
  associated: UserId[];
  state: LifecycleState;
  previousState: LifecycleState | null;
  tasks: Task[];
  comments: Comment[];
}