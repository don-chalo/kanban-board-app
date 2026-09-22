import { LifecycleState, MAX_COMMENT_TEXT_LENGTH, isStoryPoints, isTaskPriority, normalizePriority } from "./entities";
import type { Board, BoardId, Comment, CommentId, StoryPoints, Task, TaskId, TaskPriority, UserId } from "./entities";
import { Action, authorize } from "./authorize";
import { canTransition } from "./lifecycle";
import { boardCanBeDone, isBoardFrozen, isEditable } from "./guards";
import { isMember, resolveRole } from "./roles";
import { DomainError } from "./errors";

export function createBoard(
  actor: UserId,
  fields: { id: BoardId; title: string },
): Board {
  return {
    id: fields.id,
    title: fields.title,
    description: "",
    creator: actor,
    owner: actor,
    associated: [],
    state: LifecycleState.ToDo,
    previousState: null,
    tasks: [],
    comments: [],
  };
}

export function createTask(
  board: Board,
  actor: UserId,
  input: {
    id: TaskId;
    title: string;
    description?: string;
    priority?: unknown;
    storyPoints?: unknown;
  },
): Task {
  assertAuthorized(board, Action.CreateTask, null, actor);
  if (isBoardFrozen(board)) {
    throw new DomainError("read_only", `Board ${board.id} is frozen`);
  }
  if (input.priority !== undefined && !isTaskPriority(input.priority)) {
    throw new DomainError("validation", `Invalid priority: ${String(input.priority)}`);
  }
  if (
    input.storyPoints !== undefined &&
    input.storyPoints !== null &&
    !isStoryPoints(input.storyPoints)
  ) {
    throw new DomainError("validation", `Invalid story points: ${String(input.storyPoints)}`);
  }
  const task: Task = {
    id: input.id,
    boardId: board.id,
    creator: actor,
    owner: actor,
    title: input.title,
    description: input.description ?? "",
    state: LifecycleState.ToDo,
    previousState: null,
    priority: normalizePriority(input.priority),
    startedAt: null,
    storyPoints: isStoryPoints(input.storyPoints) ? input.storyPoints : null,
    comments: [],
  };
  board.tasks.push(task);
  return task;
}

export function moveTask(
  board: Board,
  actor: UserId,
  taskId: TaskId,
  target: LifecycleState,
  now: string = new Date().toISOString(),
): void {
  const task = findTask(board, taskId);
  assertAuthorized(board, Action.MoveTask, task, actor);
  if (!isEditable(board, task)) {
    throw new DomainError("read_only", "Task is not editable");
  }
  if (board.state !== LifecycleState.InProgress) {
    throw new DomainError(
      "board_not_in_progress",
      `Tasks cannot move while board ${board.id} is not In Progress`,
    );
  }
  if (!canTransition(task.state, target, task.previousState)) {
    throw new DomainError(
      "invalid_transition",
      `Cannot move task from ${task.state} to ${target}`,
    );
  }
  if (
    task.state === LifecycleState.ToDo &&
    target === LifecycleState.InProgress &&
    task.startedAt === null
  ) {
    task.startedAt = now;
  }
  applyStateTransition(task, target);
}

export function moveBoard(
  board: Board,
  actor: UserId,
  target: LifecycleState,
): void {
  assertAuthorized(board, Action.ManageBoard, null, actor);
  changeBoardState(board, target);
}

export function editTask(
  board: Board,
  actor: UserId,
  taskId: TaskId,
  patch: {
    title?: string;
    description?: string;
    priority?: TaskPriority | unknown;
    storyPoints?: StoryPoints | null | unknown;
  },
): void {
  const task = findTask(board, taskId);
  assertAuthorized(board, Action.EditTask, task, actor);
  if (!isEditable(board, task)) {
    throw new DomainError("read_only", "Task is not editable");
  }
  if (patch.title !== undefined) task.title = patch.title;
  if (patch.description !== undefined) task.description = patch.description;
  if (patch.priority !== undefined) {
    if (!isTaskPriority(patch.priority)) {
      throw new DomainError("validation", `Invalid priority: ${String(patch.priority)}`);
    }
    task.priority = patch.priority as TaskPriority;
  }
  if (patch.storyPoints !== undefined) {
    if (patch.storyPoints !== null && !isStoryPoints(patch.storyPoints)) {
      throw new DomainError(
        "validation",
        `Invalid story points: ${String(patch.storyPoints)}`,
      );
    }
    task.storyPoints = patch.storyPoints as StoryPoints | null;
  }
}

export function reassignTaskOwner(
  board: Board,
  actor: UserId,
  taskId: TaskId,
  newOwner: UserId,
): void {
  const task = findTask(board, taskId);
  assertAuthorized(board, Action.ReassignTaskOwner, task, actor);
  if (isBoardFrozen(board)) {
    throw new DomainError("read_only", `Board ${board.id} is frozen`);
  }
  if (!isMember(board, newOwner)) {
    throw new DomainError(
      "member_required",
      `User ${newOwner} is not a member of board ${board.id}`,
    );
  }
  task.owner = newOwner;
}

export function reassignBoardOwner(
  board: Board,
  actor: UserId,
  newOwner: UserId,
): void {
  assertAuthorized(board, Action.ManageBoard, null, actor);
  if (isBoardFrozen(board)) {
    throw new DomainError("read_only", `Board ${board.id} is frozen`);
  }
  if (!isMember(board, newOwner)) {
    throw new DomainError(
      "member_required",
      `User ${newOwner} is not a member of board ${board.id}`,
    );
  }
  board.associated = board.associated.filter((m) => m !== newOwner);
  board.owner = newOwner;
}

export function deleteTask(board: Board, actor: UserId, taskId: TaskId): void {
  const task = findTask(board, taskId);
  assertAuthorized(board, Action.DeleteTask, task, actor);
  if (isBoardFrozen(board)) {
    throw new DomainError("read_only", `Board ${board.id} is frozen`);
  }
  board.tasks = board.tasks.filter((t) => t.id !== task.id);
}

export function addComment(
  board: Board,
  actor: UserId,
  input: { id: CommentId; text: string },
  now: string = new Date().toISOString(),
): Comment {
  if (!isMember(board, actor)) {
    throw new DomainError(
      "unauthorized",
      `User ${actor} is not authorized to perform this action`,
    );
  }
  const comment: Comment = {
    id: input.id,
    author: actor,
    text: assertValidCommentText(input.text),
    createdAt: now,
  };
  board.comments.push(comment);
  return comment;
}

export function editComment(
  board: Board,
  actor: UserId,
  commentId: CommentId,
  text: string,
): Comment {
  const comment = findComment(board, commentId);
  assertCommentAuthorOrManager(board, comment, actor);
  comment.text = assertValidCommentText(text);
  return comment;
}

export function removeComment(board: Board, actor: UserId, commentId: CommentId): void {
  const comment = findComment(board, commentId);
  assertCommentAuthorOrManager(board, comment, actor);
  board.comments = board.comments.filter((c) => c.id !== comment.id);
}

export function addTaskComment(
  board: Board,
  actor: UserId,
  taskId: TaskId,
  input: { id: CommentId; text: string },
  now: string = new Date().toISOString(),
): Comment {
  const task = findTask(board, taskId);
  if (!isMember(board, actor)) {
    throw new DomainError(
      "unauthorized",
      `User ${actor} is not authorized to perform this action`,
    );
  }
  const comment: Comment = {
    id: input.id,
    author: actor,
    text: assertValidCommentText(input.text),
    createdAt: now,
  };
  task.comments.push(comment);
  return comment;
}

export function editTaskComment(
  board: Board,
  actor: UserId,
  taskId: TaskId,
  commentId: CommentId,
  text: string,
): Comment {
  const task = findTask(board, taskId);
  const comment = findTaskComment(task, commentId);
  assertTaskCommentAuthorOrManager(board, task, comment, actor);
  comment.text = assertValidCommentText(text);
  return comment;
}

export function removeTaskComment(
  board: Board,
  actor: UserId,
  taskId: TaskId,
  commentId: CommentId,
): void {
  const task = findTask(board, taskId);
  const comment = findTaskComment(task, commentId);
  assertTaskCommentAuthorOrManager(board, task, comment, actor);
  task.comments = task.comments.filter((c) => c.id !== comment.id);
}

function assertTaskCommentAuthorOrManager(
  board: Board,
  task: Task,
  comment: Comment,
  actor: UserId,
): void {
  if (comment.author === actor || task.owner === actor) {
    return;
  }
  const role = resolveRole(board, actor);
  if (role !== "creator" && role !== "owner") {
    throw new DomainError(
      "unauthorized",
      `User ${actor} is not authorized to perform this action`,
    );
  }
}

function findTaskComment(task: Task, commentId: CommentId): Comment {
  const comment = task.comments.find((c) => c.id === commentId);
  if (!comment) throw new DomainError("not_found", `Comment ${commentId} not found`);
  return comment;
}

function assertValidCommentText(text: unknown): string {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new DomainError("validation", "Comment text is required");
  }
  if (text.length > MAX_COMMENT_TEXT_LENGTH) {
    throw new DomainError(
      "validation",
      `Comment text must be at most ${MAX_COMMENT_TEXT_LENGTH} characters`,
    );
  }
  return text;
}

function assertCommentAuthorOrManager(board: Board, comment: Comment, actor: UserId): void {
  if (comment.author === actor) {
    return;
  }
  const role = resolveRole(board, actor);
  if (role !== "creator" && role !== "owner") {
    throw new DomainError(
      "unauthorized",
      `User ${actor} is not authorized to perform this action`,
    );
  }
}

function findComment(board: Board, commentId: CommentId): Comment {
  const comment = board.comments.find((c) => c.id === commentId);
  if (!comment) throw new DomainError("not_found", `Comment ${commentId} not found`);
  return comment;
}

export type ManageBoardChange =
  | { kind: "addMember"; member: UserId }
  | { kind: "removeMember"; member: UserId }
  | { kind: "editAttributes"; title?: string; description?: string }
  | { kind: "changeState"; target: LifecycleState };

export function manageBoard(
  board: Board,
  actor: UserId,
  change: ManageBoardChange,
): void {
  assertAuthorized(board, Action.ManageBoard, null, actor);
  switch (change.kind) {
    case "addMember":
      if (isBoardFrozen(board)) {
        throw new DomainError("read_only", `Board ${board.id} is frozen`);
      }
      if (board.associated.includes(change.member)) {
        throw new DomainError("duplicate_member", `User ${change.member} is already a member`);
      }
      if (change.member === board.creator || change.member === board.owner) {
        throw new DomainError(
          "cannot_modify_creator",
          `User ${change.member} is the board creator or owner`,
        );
      }
      board.associated.push(change.member);
      break;
    case "removeMember":
      if (isBoardFrozen(board)) {
        throw new DomainError("read_only", `Board ${board.id} is frozen`);
      }
      if (!board.associated.includes(change.member)) {
        throw new DomainError(
          "not_associated",
          `User ${change.member} is not an associated member`,
        );
      }
      board.associated = board.associated.filter((m) => m !== change.member);
      break;
    case "editAttributes":
      if (change.title !== undefined && isBoardFrozen(board)) {
        throw new DomainError("read_only", `Board ${board.id} is frozen`);
      }
      if (change.title !== undefined) board.title = change.title;
      if (change.description !== undefined) board.description = change.description;
      break;
    case "changeState":
      changeBoardState(board, change.target);
      break;
  }
}

function changeBoardState(board: Board, target: LifecycleState): void {
  if (target === LifecycleState.Done && !boardCanBeDone(board)) {
    throw new DomainError(
      "board_not_done",
      "Board cannot be Done while it has tasks not in Done or Cancelled",
    );
  }
  if (!canTransition(board.state, target, board.previousState)) {
    throw new DomainError(
      "invalid_transition",
      `Cannot move board from ${board.state} to ${target}`,
    );
  }
  applyStateTransition(board, target);
}

function assertAuthorized(
  board: Board,
  action: Action,
  task: Task | null,
  actor: UserId,
): void {
  if (!authorize(action, board, task, actor)) {
    throw new DomainError(
      "unauthorized",
      `User ${actor} is not authorized to perform this action`,
    );
  }
}

function findTask(board: Board, taskId: TaskId): Task {
  const task = board.tasks.find((t) => t.id === taskId);
  if (!task) throw new DomainError("not_found", `Task ${taskId} not found`);
  return task;
}

function applyStateTransition(
  entity: { state: LifecycleState; previousState: LifecycleState | null },
  target: LifecycleState,
): void {
  const from = entity.state;
  entity.state = target;
  entity.previousState = target === LifecycleState.Blocked ? from : null;
}