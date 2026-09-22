import type { UserIdentity } from "./session";
import { readIdentity } from "./session";

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export const LIFECYCLE_STATES = [
  "ToDo",
  "InProgress",
  "Done",
  "Blocked",
  "Cancelled",
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];
export type UserId = string;

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface Task {
  id: string;
  boardId: string;
  creator: UserId;
  owner: UserId;
  title: string;
  description: string;
  state: LifecycleState;
  previousState: LifecycleState | null;
  priority?: TaskPriority;
  startedAt?: string | null;
  storyPoints?: StoryPoints | null;
  comments: Comment[];
}

export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13;

export interface Board {
  id: string;
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

export interface Comment {
  id: string;
  author: UserId;
  text: string;
  createdAt: string;
}

export type ListBoardsResult =
  | { status: "ok"; boards: Board[] }
  | { status: "unauthorized" }
  | { status: "error" };

export type GetBoardResult =
  | { status: "ok"; board: Board }
  | { status: "unauthorized" }
  | { status: "error" };

function authHeaders(): Record<string, string> {
  const identity = readIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  return { "X-User-Id": identity.id };
}

export async function login(email: string): Promise<UserIdentity> {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status})`);
  }
  return (await res.json()) as UserIdentity;
}

export async function listBoards(): Promise<ListBoardsResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/boards`, {
      headers: authHeaders(),
    });
    if (res.status === 401) {
      return { status: "unauthorized" };
    }
    if (!res.ok) {
      return { status: "error" };
    }
    return { status: "ok", boards: (await res.json()) as Board[] };
  } catch {
    return { status: "error" };
  }
}

export async function createBoard(title: string): Promise<Board> {
  const res = await fetch(`${API_BASE_URL}/boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`Create board failed (${res.status})`);
  }
  return (await res.json()) as Board;
}

export async function getBoard(boardId: string): Promise<GetBoardResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
      headers: authHeaders(),
    });
    if (res.status === 401) {
      return { status: "unauthorized" };
    }
    if (!res.ok) {
      return { status: "error" };
    }
    return { status: "ok", board: (await res.json()) as Board };
  } catch {
    return { status: "error" };
  }
}

export async function searchUsers(prefix: string): Promise<UserIdentity[]> {
  const res = await fetch(`${API_BASE_URL}/users?email=${encodeURIComponent(prefix)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`User search failed (${res.status})`);
  }
  return (await res.json()) as UserIdentity[];
}

export async function resolveUser(email: string): Promise<UserIdentity> {
  const res = await fetch(`${API_BASE_URL}/users/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error(`Resolve user failed (${res.status})`);
  }
  return (await res.json()) as UserIdentity;
}

export async function addBoardMember(boardId: string, memberId: UserId): Promise<Board> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ member: memberId }),
  });
  if (!res.ok) {
    throw new Error(`Add board member failed (${res.status})`);
  }
  return (await res.json()) as Board;
}

export async function removeMember(boardId: string, memberId: UserId): Promise<Board> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/members/${memberId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Remove board member failed (${res.status})`);
  }
  return (await res.json()) as Board;
}

export async function getUser(userId: string): Promise<UserIdentity | null> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Get user failed (${res.status})`);
  }
  return (await res.json()) as UserIdentity;
}

export interface TransitionsTable {
  transitions: Record<LifecycleState, LifecycleState[]>;
  frozenStates: LifecycleState[];
}

export async function getTransitions(): Promise<TransitionsTable> {
  const res = await fetch(`${API_BASE_URL}/transitions`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Get transitions failed (${res.status})`);
  }
  return (await res.json()) as TransitionsTable;
}

export async function batchUsers(ids: UserId[]): Promise<UserIdentity[]> {
  const res = await fetch(`${API_BASE_URL}/users/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    throw new Error(`Batch users failed (${res.status})`);
  }
  return (await res.json()) as UserIdentity[];
}

export async function boardActions(boardId: string): Promise<LifecycleState[]> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/actions`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Board actions failed (${res.status})`);
  }
  return (await res.json()) as LifecycleState[];
}

export async function taskActions(boardId: string, taskId: string): Promise<LifecycleState[]> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/${taskId}/actions`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Task actions failed (${res.status})`);
  }
  return (await res.json()) as LifecycleState[];
}

export async function createTask(
  boardId: string,
  input: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    storyPoints?: StoryPoints | null;
  },
): Promise<Task> {
  const body: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    storyPoints?: StoryPoints | null;
  } = {
    title: input.title,
  };
  if (input.description !== undefined) {
    body.description = input.description;
  }
  if (input.priority !== undefined) {
    body.priority = input.priority;
  }
  if (input.storyPoints !== undefined) {
    body.storyPoints = input.storyPoints;
  }
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Create task failed (${res.status})`);
  }
  return (await res.json()) as Task;
}

export async function moveBoard(boardId: string, target: LifecycleState): Promise<Board> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) {
    throw await toMoveError("Move board", res);
  }
  return (await res.json()) as Board;
}

async function toMoveError(prefix: string, res: Response): Promise<Error> {
  let code: string | null = null;
  try {
    const body = (await res.json()) as { error?: { code?: string } };
    code = body?.error?.code ?? null;
  } catch {
    code = null;
  }
  const message = code === null ? `${prefix} failed (${res.status})` : `${prefix} failed (${res.status}: ${code})`;
  return Object.assign(new Error(message), code === null ? {} : { code });
}

export async function updateBoard(
  boardId: string,
  input: { title?: string; description?: string; owner?: string },
): Promise<Board> {
  const body: { title?: string; description?: string; owner?: string } = {};
  if (input.title !== undefined) {
    body.title = input.title;
  }
  if (input.description !== undefined) {
    body.description = input.description;
  }
  if (input.owner !== undefined) {
    body.owner = input.owner;
  }
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Update board failed (${res.status})`);
  }
  return (await res.json()) as Board;
}

export async function createComment(boardId: string, text: string): Promise<Comment> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw await toMoveError("Create comment", res);
  }
  return (await res.json()) as Comment;
}

export async function editComment(boardId: string, commentId: string, text: string): Promise<Comment> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw await toMoveError("Edit comment", res);
  }
  return (await res.json()) as Comment;
}

export async function removeComment(boardId: string, commentId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw await toMoveError("Remove comment", res);
  }
}

export async function moveTask(
  boardId: string,
  taskId: string,
  target: LifecycleState,
): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/${taskId}/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) {
    throw await toMoveError("Move task", res);
  }
  return (await res.json()) as Task;
}

export async function createTaskComment(
  boardId: string,
  taskId: string,
  text: string,
): Promise<Comment> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/${taskId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw await toMoveError("Create task comment", res);
  }
  return (await res.json()) as Comment;
}

export async function editTaskComment(
  boardId: string,
  taskId: string,
  commentId: string,
  text: string,
): Promise<Comment> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/${taskId}/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw await toMoveError("Edit task comment", res);
  }
  return (await res.json()) as Comment;
}

export async function removeTaskComment(
  boardId: string,
  taskId: string,
  commentId: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/${taskId}/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw await toMoveError("Remove task comment", res);
  }
}

export async function setTaskOwner(
  boardId: string,
  taskId: string,
  owner: UserId,
): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/${taskId}/owner`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ owner }),
  });
  if (!res.ok) {
    throw new Error(`Set task owner failed (${res.status})`);
  }
  return (await res.json()) as Task;
}

export async function updateTask(
  boardId: string,
  taskId: string,
  input: { title?: string; description?: string; priority?: TaskPriority; storyPoints?: StoryPoints | null },
): Promise<Task> {
  const body: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    storyPoints?: StoryPoints | null;
  } = {};
  if (input.title !== undefined) {
    body.title = input.title;
  }
  if (input.description !== undefined) {
    body.description = input.description;
  }
  if (input.priority !== undefined) {
    body.priority = input.priority;
  }
  if (input.storyPoints !== undefined) {
    body.storyPoints = input.storyPoints;
  }
  const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Update task failed (${res.status})`);
  }
  return (await res.json()) as Task;
}