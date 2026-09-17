import { LifecycleState, Task } from "../domain/entities";
import { TaskDoc } from "../models";

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
  };
}