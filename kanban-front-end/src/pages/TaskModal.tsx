import { useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  createTask,
  createTaskComment,
  editTaskComment,
  removeTaskComment,
  setTaskOwner,
  updateTask,
  type Comment,
  type StoryPoints,
  type Task,
  type TaskPriority,
  type UserId,
} from '../lib/api'
import InlineEdit from '../components/InlineEdit'

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
  editable?: boolean
  onClose: () => void
  onCreate: (taskId: string) => void
}

function TaskModal({
  boardId,
  actorId,
  isManager,
  members,
  task,
  editable = true,
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
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const [comments, setComments] = useState<Comment[]>(task === undefined ? [] : [...task.comments])
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [removeCommentId, setRemoveCommentId] = useState<string | null>(null)
  const [addingComment, setAddingComment] = useState(false)
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null)

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

  function canEditComment(comment: Comment): boolean {
    if (task === undefined) {
      return false
    }
    return comment.author === actorId || isManager || task.owner === actorId
  }

  const sortedComments = [...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  async function handleCommentAdd() {
    if (task === undefined || addingComment) {
      return
    }
    const text = commentText.trim()
    if (text.length === 0) {
      setCommentError('Comment is required.')
      return
    }
    setCommentError(null)
    setAddingComment(true)
    try {
      const created = await createTaskComment(boardId, task.id, text)
      setComments((prev) => [...prev, created])
      setCommentText('')
    } catch {
      setCommentError('Could not add the comment.')
    } finally {
      setAddingComment(false)
    }
  }

  async function handleCommentEdit(commentId: string, next: string) {
    if (task === undefined) {
      return
    }
    setBusyCommentId(commentId)
    try {
      const updated = await editTaskComment(boardId, task.id, commentId, next)
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch {
      setCommentError('Could not save the comment.')
    } finally {
      setBusyCommentId(null)
    }
  }

  async function handleCommentRemove(commentId: string) {
    if (task === undefined) {
      return
    }
    setBusyCommentId(commentId)
    try {
      await removeTaskComment(boardId, task.id, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setRemoveCommentId(null)
    } catch {
      setCommentError('Could not remove the comment.')
    } finally {
      setBusyCommentId(null)
    }
  }

  function renderSpinner(label: string) {
    return (
      <span
        role="status"
        aria-label={label}
        className="inline-block h-4 w-4 shrink-0 animate-spin border border-xenon border-t-transparent"
      />
    )
  }

  function handleCommentKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleCommentAdd()
    }
  }

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
        className='flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col gap-4 overflow-y-auto border-2 border-xenon bg-void p-6'
      >
        <div className="flex items-start justify-between gap-3">
          {task !== undefined ? (
            <button
              type="button"
              aria-label="Toggle task form"
              aria-expanded={showForm}
              onClick={() => setShowForm((show) => !show)}
              className="min-w-0 flex-1 text-left outline-none hover:bg-xenon/10 focus-visible:ring-2 focus-visible:ring-xenon"
            >
              <span aria-hidden="true" className="text-xl font-bold tracking-widest opacity-70">
                {showForm ? '^' : 'v'}{' '}
              </span>
              <span className="text-xl font-bold tracking-widest">&gt; EDIT TASK</span>
            </button>
          ) : (
            <h2 className="text-xl font-bold tracking-widest">&gt; NEW TASK</h2>
          )}
          <button
            type="button"
            aria-label="Close task modal"
            onClick={onClose}
            className="shrink-0 border border-xenon px-2 py-1 font-bold leading-none hover:bg-xenon/10"
          >
            x
          </button>
        </div>
        {showForm && (
          <>
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
            autoFocus={editable}
            disabled={!editable}
            aria-label="Task title"
            className="border border-xenon bg-transparent px-3 py-2 caret-xenon outline-none placeholder:text-xenon/40 focus:ring-2 focus:ring-xenon disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm tracking-widest">DESCRIPTION</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            disabled={!editable}
            aria-label="Task description"
            className="resize-none border border-xenon bg-transparent px-3 py-2 caret-xenon outline-none placeholder:text-xenon/40 focus:ring-2 focus:ring-xenon disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm tracking-widest">PRIORITY</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              disabled={!editable}
              aria-label="Task priority"
              className="border border-xenon bg-void px-3 py-2 text-xenon outline-none focus:ring-2 focus:ring-xenon disabled:cursor-not-allowed disabled:opacity-40"
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
              disabled={!editable}
              aria-label="Story points"
              className="border border-xenon bg-void px-3 py-2 text-xenon outline-none focus:ring-2 focus:ring-xenon disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value="">--</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="5">5</option>
              <option value="8">8</option>
              <option value="13">13</option>
            </select>
          </label>
        </div>

        {editable && isManager && (
          <label className="flex flex-col gap-1">
            <span className="text-sm tracking-widest">OWNER</span>
            <select
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              disabled={!editable}
              aria-label="Task owner"
              className="border border-xenon bg-void px-3 py-2 text-xenon outline-none focus:ring-2 focus:ring-xenon disabled:cursor-not-allowed disabled:opacity-40"
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
          </>
        )}

        <div className="flex gap-3">
          {editable && showForm && (
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
          )}
        </div>

        {task !== undefined && (
          <div className="mt-2 border-t border-xenon pt-3">
            <button
              type="button"
              aria-label="Toggle task comments"
              aria-expanded={commentsOpen}
              onClick={() => setCommentsOpen((open) => !open)}
              className="text-xs font-bold tracking-widest opacity-80 hover:bg-xenon/10"
            >
              {commentsOpen ? '^' : 'v'} COMMENTS ({comments.length})
            </button>
            {commentsOpen && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(event) => {
                      setCommentText(event.target.value)
                      setCommentError(null)
                    }}
                    onKeyDown={handleCommentKeyDown}
                    placeholder="Write a comment..."
                    aria-label="New task comment"
                    disabled={addingComment}
                    className="w-full border border-xenon bg-transparent px-3 py-1 text-sm caret-xenon outline-none placeholder:text-xenon/40 focus:ring-2 focus:ring-xenon disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  {addingComment && renderSpinner('Adding comment')}
                </div>
                {commentError !== null && (
                  <p role="alert" className="mt-1 text-xs tracking-widest">
                    ERR: {commentError}
                  </p>
                )}
                {sortedComments.length === 0 ? (
                  <p className="mt-2 text-sm tracking-widest opacity-70">(no comments yet)</p>
                ) : (
                  <ul className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto">
                    {sortedComments.map((comment) => (
                      <li key={comment.id} className="border border-xenon px-3 py-2">
                        <div className="flex items-center justify-between gap-2 text-xs tracking-widest opacity-70">
                          <span>
                            {members.get(comment.author) ?? comment.author} -{' '}
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {busyCommentId === comment.id && renderSpinner('Working on comment')}
                            {canEditComment(comment) && (
                              <button
                                type="button"
                                aria-label={`Remove task comment ${comment.id}`}
                                onClick={() => setRemoveCommentId(comment.id)}
                                disabled={busyCommentId === comment.id}
                                className="border border-xenon px-1 font-bold leading-none hover:bg-xenon/10 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                x
                              </button>
                            )}
                          </span>
                        </div>
                        <InlineEdit
                          value={comment.text}
                          displayText={comment.text}
                          editable={canEditComment(comment)}
                          inputLabel={`Task comment ${comment.id}`}
                          validate={(value) =>
                            value.trim().length === 0 ? 'Comment is required.' : null
                          }
                          onSave={(next) => handleCommentEdit(comment.id, next)}
                          displayClassName="mt-1 block w-full cursor-text border-none bg-transparent p-0 text-left text-sm"
                          inputClassName="mt-1 block w-full border border-xenon bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-xenon"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </form>

      {removeCommentId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Remove task comment"
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRemoveCommentId(null)
            }
          }}
        >
          <div className="flex w-full max-w-sm flex-col gap-4 border-2 border-xenon bg-void p-6">
            <h2 className="text-xl font-bold tracking-widest">REMOVE COMMENT</h2>
            <p className="text-sm tracking-widest">Delete this comment? This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busyCommentId !== null}
                onClick={() => void handleCommentRemove(removeCommentId)}
                className="flex flex-1 items-center justify-center gap-2 bg-xenon px-4 py-2 font-bold tracking-widest text-void hover:bg-xenon/80 disabled:opacity-50"
              >
                {busyCommentId !== null && renderSpinner('Removing comment')}
                YES
              </button>
              <button
                type="button"
                onClick={() => setRemoveCommentId(null)}
                className="flex-1 border border-xenon px-4 py-2 font-bold tracking-widest hover:bg-xenon/10"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskModal