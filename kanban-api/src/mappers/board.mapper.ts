import { Board, LifecycleState, Task } from "../domain/entities";
import { BoardDoc } from "../models";

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
  };
}