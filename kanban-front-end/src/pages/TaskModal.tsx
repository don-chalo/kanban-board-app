import { useState, type FormEvent } from 'react'
import {
  createTask,
  setTaskOwner,
  updateTask,
  type StoryPoints,
  type Task,
  type TaskPriority,
  type UserId,
} from '../lib/api'

export interface NewTaskValues {
  title: string
  description?: string
  owner?: UserId
}

interface TaskModalProps {
  boardId: string
  actorId: UserId
  isManager: boolean
  members: Map<UserId, string>
  task?: Task
  onClose: () => void
  onCreate: (taskId: string) => void
}

function TaskModal({
  boardId,
  actorId,
  isManager,
  members,
  task,
  onClose,
  onCreate,
}: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [owner, setOwner] = useState(task?.owner ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [storyPoints, setStoryPoints] = useState<StoryPoints | null>(
    task?.storyPoints ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = title.trim()
    if (value.length === 0) {
      setError('Task title is required.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (task !== undefined) {
        const patch: {
          title: string;
          description: string;
          priority?: TaskPriority;
          storyPoints?: StoryPoints | null;
        } = {
          title: value,
          description: description.trim(),
        }
        if (priority !== (task.priority ?? 'medium')) {
          patch.priority = priority
        }
        if (storyPoints !== (task.storyPoints ?? null)) {
          patch.storyPoints = storyPoints
        }
        await updateTask(boardId, task.id, patch)
        if (owner.length > 0 && owner !== task.owner) {
          await setTaskOwner(boardId, task.id, owner)
        }
        onCreate(task.id)
      } else {
        const created = await createTask(boardId, {
          title: value,
          description: description.trim().length > 0 ? description.trim() : undefined,
          priority,
          storyPoints,
        })
        if (owner.length > 0 && owner !== actorId) {
          await setTaskOwner(boardId, created.id, owner)
        }
        onCreate(created.id)
      }
    } catch {
      setError(task !== undefined ? 'Could not update the task.' : 'Could not create the task.')
    } finally {
      setSubmitting(false)
    }
  }

  const ownerOptions = [...members.entries()]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={task !== undefined ? 'Edit task' : 'New task'}
      className="fixed inset-0 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-4 border-2 border-xenon bg-void p-6"
      >
        <h2 className="text-xl font-bold tracking-widest">
          {task !== undefined ? '> EDIT TASK' : '> NEW TASK'}
        </h2>
        {task?.startedAt !== null && (
          <div className="flex justify-end">
            <span
              data-testid="task-started-at"
              title={task?.startedAt}
              aria-label={`Started ${task?.startedAt}`}
              className="text-[12px] tracking-widest opacity-70"
            >
              In progress since: {task?.startedAt?.slice(0, 10)}
            </span>
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm tracking-widest">TITLE</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            aria-label="Task title"
            className="border border-xenon bg-transparent px-3 py-2 caret-xenon outline-none placeholder:text-xenon/40 focus:ring-2 focus:ring-xenon"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm tracking-widest">DESCRIPTION</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            aria-label="Task description"
            className="resize-none border border-xenon bg-transparent px-3 py-2 caret-xenon outline-none placeholder:text-xenon/40 focus:ring-2 focus:ring-xenon"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm tracking-widest">PRIORITY</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              aria-label="Task priority"
              className="border border-xenon bg-void px-3 py-2 text-xenon outline-none focus:ring-2 focus:ring-xenon"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm tracking-widest">STORY PTS</span>
            <select
              value={storyPoints === null ? '' : String(storyPoints)}
              onChange={(event) =>
                setStoryPoints(
                  event.target.value === '' ? null : (Number(event.target.value) as StoryPoints),
                )
              }
              aria-label="Story points"
              className="border border-xenon bg-void px-3 py-2 text-xenon outline-none focus:ring-2 focus:ring-xenon"
            >
              <option value="">--</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="8">8</option>
              <option value="13">13</option>
            </select>
          </label>
        </div>

        {isManager && (
          <label className="flex flex-col gap-1">
            <span className="text-sm tracking-widest">OWNER</span>
            <select
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              aria-label="Task owner"
              className="border border-xenon bg-void px-3 py-2 text-xenon outline-none focus:ring-2 focus:ring-xenon"
            >
              {ownerOptions.map(([id, email]) => (
                <option key={id} value={id}>
                  {id === actorId ? '(me)' : email}
                </option>
              ))}
            </select>
          </label>
        )}

        {error !== null && (
          <p role="alert" className="text-sm tracking-widest">
            ERR: {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-xenon px-4 py-2 font-bold tracking-widest text-void hover:bg-xenon/80 disabled:opacity-50"
          >
            {task !== undefined
              ? submitting
                ? 'SAVING...'
                : '> SAVE'
              : submitting
                ? 'CREATING...'
                : '> CREATE'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-xenon px-4 py-2 font-bold tracking-widest hover:bg-xenon/10"
          >
            CLOSE
          </button>
        </div>
      </form>
    </div>
  )
}

export default TaskModal