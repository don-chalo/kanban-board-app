import { Board, Comment, LifecycleState, Task } from "../domain/entities";
import { BoardDoc, CommentDoc } from "../models";

function commentDocToDomain(doc: CommentDoc): Comment {
  return { id: doc._id, author: doc.author, text: doc.text, createdAt: doc.createdAt };
}

function commentToDoc(comment: Comment): CommentDoc {
  return { _id: comment.id, author: comment.author, text: comment.text, createdAt: comment.createdAt };
}

export function boardDocToDomain(doc: BoardDoc, tasks: Task[] = []): Board {
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description,
    creator: doc.creator,
    owner: doc.owner,
    associated: [...doc.associated],
    state: doc.state as LifecycleState,
    previousState: doc.previousState as LifecycleState | null,
    tasks,
    comments: (doc.comments ?? []).map(commentDocToDomain),
  };
}

export function boardToDoc(board: Board): BoardDoc {
  return {
    _id: board.id,
    title: board.title,
    description: board.description,
    creator: board.creator,
    owner: board.owner,
    associated: [...board.associated],
    state: board.state,
    previousState: board.previousState,
    comments: board.comments.map(commentToDoc),
  };
}