import { LifecycleState, Task } from "../domain/entities";
import type { Comment } from "../domain/entities";
import { CommentDoc, TaskDoc } from "../models";

function commentDocToDomain(doc: CommentDoc): Comment {
  return { id: doc._id, author: doc.author, text: doc.text, createdAt: doc.createdAt };
}

function commentToDoc(comment: Comment): CommentDoc {
  return { _id: comment.id, author: comment.author, text: comment.text, createdAt: comment.createdAt };
}

export function taskDocToDomain(doc: TaskDoc): Task {
  return {
    id: doc._id,
    boardId: doc.boardId,
    creator: doc.creator,
    owner: doc.owner,
    title: doc.title,
    description: doc.description,
    state: doc.state as LifecycleState,
    previousState: doc.previousState as LifecycleState | null,
    priority: (doc.priority as Task["priority"] | undefined) ?? "medium",
    startedAt: doc.startedAt ?? null,
    storyPoints: (doc.storyPoints as Task["storyPoints"] | undefined) ?? null,
    comments: (doc.comments ?? []).map(commentDocToDomain),
  };
}

export function taskToDoc(task: Task): TaskDoc {
  return {
    _id: task.id,
    boardId: task.boardId,
    creator: task.creator,
    owner: task.owner,
    title: task.title,
    description: task.description,
    state: task.state,
    previousState: task.previousState,
    priority: task.priority ?? "medium",
    startedAt: task.startedAt ?? null,
    storyPoints: task.storyPoints ?? null,
    comments: task.comments.map(commentToDoc),
  };
}