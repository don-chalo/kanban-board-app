import * as Select from '@radix-ui/react-select'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addBoardMember,
  getBoard,
  getTransitions,
  moveBoard,
  moveTask,
  removeMember,
  resolveUser,
  searchUsers,
  updateBoard,
  PRIORITY_WEIGHT,
  type Board,
  type LifecycleState,
  type Task,
  type TransitionsTable,
  type UserId,
} from '../lib/api'
import { resolveMemberEmails } from '../lib/members'
import { clearIdentity, readIdentity, type UserIdentity } from '../lib/session'
import { COLUMN_ORDER, STATE_LABELS } from '../lib/states'
import InlineEdit from '../components/InlineEdit'
import TaskModal from './TaskModal'
import TaskCard from './TaskCard'

const TERMINAL_STATES: ReadonlySet<LifecycleState> = new Set(['Done', 'Cancelled'])

function taskMatchesQuery(task: Task, members: Map<UserId, string>, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q.length === 0) {
    return true
  }
  const ownerEmail = members.get(task.owner) ?? task.owner
  const haystack = [task.title, task.description, STATE_LABELS[task.state], ownerEmail, task.owner]
  return haystack.join(' ').toLowerCase().includes(q)
}

function deriveMoves(
  table: TransitionsTable,
  board: Board,
): { boardMoves: LifecycleState[]; taskMoves: Map<string, LifecycleState[]> } {
  const frozen = table.frozenStates.includes(board.state)
  const boardMoves = TERMINAL_STATES.has(board.state) ? [] : [...(table.transitions[board.state] ?? [])]
  const taskMoves = new Map<string, LifecycleState[]>()
  for (const task of board.tasks) {
    taskMoves.set(
      task.id,
      frozen || TERMINAL_STATES.has(task.state) ? [] : [...(table.transitions[task.state] ?? [])],
    )
  }
  return { boardMoves, taskMoves }
}

function BoardDetailPage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const identity = readIdentity()

  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [members, setMembers] = useState<Map<UserId, string>>(new Map())
  const [transitions, setTransitions] = useState<TransitionsTable | null>(null)
  const [boardMoves, setBoardMoves] = useState<{ loading: boolean, moves: LifecycleState[] }>({ loading: false, moves: [] })
  const [taskMoves, setTaskMoves] = useState<Map<string, LifecycleState[]>>(new Map())
  const [failedTaskMoves, setFailedTaskMoves] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskQuery, setTaskQuery] = useState('')
  const [memberEntryOpen, setMemberEntryOpen] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberSuggestions, setMemberSuggestions] = useState<UserIdentity[]>([])
  const [memberError, setMemberError] = useState<string | null>(null)
  const [addBusy, setAddBusy] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<UserId | null>(null)
  const keepEntryOpenRef = useRef(false)

  const loadBoard = useCallback(
    async (initial: boolean) => {
      if (boardId === undefined) {
        return
      }
      if (initial) {
        setLoading(true)
      }
      setError(null)
      setPanelError(null)
      const result = await getBoard(boardId)
      if (result.status === 'unauthorized') {
        clearIdentity()
        navigate('/login')
        return
      }
      if (result.status === 'error') {
        setError('Could not load the board.')
        setLoading(false)
        return
      }
      const loaded = result.board
      setBoard(loaded)
      setLoading(false)
      setMembers(
        await resolveMemberEmails([
          loaded.creator,
          loaded.owner,
          ...loaded.associated,
        ]),
      )
      try {
        setBoardMoves({ loading: true, moves: [] })
        const table = await getTransitions()
        setTransitions(table)
        const derived = deriveMoves(table, loaded)
        setTaskMoves(derived.taskMoves)
        setFailedTaskMoves(new Set())
        setBoardMoves({ loading: false, moves: derived.boardMoves })
      } catch {
        setTransitions(null)
        setTaskMoves(new Map())
        setFailedTaskMoves(new Set(loaded.tasks.map((task) => task.id)))
        setBoardMoves({ loading: false, moves: [] })
      }
    },
    [boardId, navigate],
  )

  useEffect(() => {
    void loadBoard(true)
  }, [loadBoard])

  useEffect(() => {
    if (!memberEntryOpen) {
      setMemberSuggestions([])
      return
    }
    const prefix = memberEmail.trim()
    if (prefix.length === 0) {
      setMemberSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      void searchUsers(prefix)
        .then(setMemberSuggestions)
        .catch(() => setMemberSuggestions([]))
    }, 200)
    return () => clearTimeout(timer)
  }, [memberEmail, memberEntryOpen])

  function handleSwitchUser() {
    clearIdentity()
    navigate('/login')
  }

  async function handleTitleSave(next: string) {
    if (boardId === undefined) {
      return
    }
    setBoard(await updateBoard(boardId, { title: next }))
  }

  async function handleDescriptionSave(next: string) {
    if (boardId === undefined) {
      return
    }
    setBoard(await updateBoard(boardId, { description: next }))
  }

  async function handleBoardMove(target: LifecycleState) {
    if (boardId === undefined) {
      return
    }
    try {
      await moveBoard(boardId, target)
      await loadBoard(false)
    } catch (error) {
      const code = (error as { code?: string } | null)?.code ?? null
      const message = error instanceof Error ? error.message : ''
      if (code === 'board_not_done' || message.includes('board_not_done')) {
        setPanelError('Board cannot be Done while tasks remain.')
      } else {
        setPanelError('Could not change the board state.')
      }
    }
  }

  async function handleOwnerChange(nextOwner: UserId) {
    if (boardId === undefined) {
      return
    }
    try {
      const result = await updateBoard(boardId, { owner: nextOwner })
      setBoard(result)
    } catch {
      setPanelError('Could not reassign the owner.')
    }
  }

  async function handleTaskMove(taskId: string, target: LifecycleState) {
    if (boardId === undefined) {
      return
    }
    try {
      await moveTask(boardId, taskId, target)
      await loadBoard(false)
    } catch {
      setPanelError('Could not move the task.')
    }
  }

  function toggleMemberAdd() {
    if (addBusy) {
      return
    }
    setMemberEntryOpen((open) => {
      const next = !open
      if (!next) {
        setMemberEmail('')
        setMemberSuggestions([])
        setMemberError(null)
      }
      return next
    })
  }

  function closeMemberAdd() {
    setMemberEntryOpen(false)
    setMemberEmail('')
    setMemberSuggestions([])
    setMemberError(null)
    keepEntryOpenRef.current = false
  }

  function handleMemberAddBlur(event: FocusEvent<HTMLDivElement>) {
    if (addBusy) {
      return
    }
    if (keepEntryOpenRef.current) {
      keepEntryOpenRef.current = false
      return
    }
    const next = event.relatedTarget
    if (next !== null && event.currentTarget.contains(next)) {
      return
    }
    closeMemberAdd()
  }

  function handleMemberAddKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (addBusy) {
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMemberAdd()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      void commitMember(null)
    }
  }

  function handleMemberEmailChange(value: string) {
    setMemberEmail(value)
    setMemberError(null)
  }

  async function addMemberById(id: UserId) {
    if (boardId === undefined) {
      return
    }
    setAddBusy(true)
    setMemberError(null)
    try {
      await addBoardMember(boardId, id)
      setMemberEmail('')
      setMemberSuggestions([])
      setMemberError(null)
      keepEntryOpenRef.current = true
      await loadBoard(false)
    } catch {
      setMemberError('Could not add the member.')
    } finally {
      setAddBusy(false)
    }
  }

  function commitMember(suggestion: UserIdentity | null) {
    if (addBusy) {
      return
    }
    if (suggestion !== null) {
      void addMemberById(suggestion.id)
      return
    }
    if (board === null) {
      return
    }
    const normalized = memberEmail.trim().toLowerCase()
    if (normalized.length === 0) {
      setMemberError('Enter an email.')
      return
    }
    const existingEmails = [...members.values()].map((email) => email.toLowerCase())
    if (existingEmails.includes(normalized)) {
      setMemberError('Already a member.')
      return
    }
    if (
      normalized === (members.get(board.creator) ?? board.creator).toLowerCase() ||
      normalized === (members.get(board.owner) ?? board.owner).toLowerCase()
    ) {
      setMemberError('Cannot add the creator or owner.')
      return
    }
    setAddBusy(true)
    setMemberError(null)
    void resolveUser(normalized)
      .then((identity) => addMemberById(identity.id))
      .catch(() => {
        setAddBusy(false)
        setMemberError('Could not find that email.')
      })
  }

  function handleMemberRemoveClick(target: UserId) {
    if (board === null) {
      return
    }
    if (board.tasks.some((task) => task.owner === target)) {
      setRemoveTarget(target)
      return
    }
    void removeMemberById(target)
  }

  function closeRemoveDialog() {
    setRemoveTarget(null)
  }

  async function removeMemberById(memberId: UserId) {
    if (boardId === undefined) {
      return
    }
    setMemberError(null)
    try {
      const result = await removeMember(boardId, memberId)
      setBoard(result)
      setRemoveTarget(null)
    } catch {
      setMemberError('Could not remove the member.')
    }
  }

  if (boardId === undefined) {
    return null
  }

  if (loading) {
    return <main className="min-h-screen bg-void font-matrix text-xenon">LOADING BOARD...</main>
  }

  if (error !== null) {
    return (
      <main className="min-h-screen bg-void font-matrix text-xenon">
        ERR: {error}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-3 bg-xenon px-2 py-1 font-bold text-void"
        >
          RETRY
        </button>
      </main>
    )
  }

  if (board === null) {
    return <main className="min-h-screen bg-void font-matrix text-xenon"></main>
  }

  const frozen = (transitions?.frozenStates ?? []).includes(board.state)
  const actorId = identity?.id ?? ''
  const isManager = board.creator === actorId || board.owner === actorId

  function canEditTask(task: Task): boolean {
    if (frozen) {
      return false
    }
    if (task.state === 'Done' || task.state === 'Cancelled') {
      return false
    }
    return isManager || task.owner === actorId
  }
  const creatorEmail = members.get(board.creator) ?? board.creator
  const ownerEmail = members.get(board.owner) ?? board.owner
  const totalPoints = board.tasks.reduce((sum, task) => sum + (task.storyPoints ?? 0), 0)
  const inProgressTasks = board.tasks.filter((task) => task.state === 'InProgress')
  const inProgressPoints = inProgressTasks.reduce(
    (sum, task) => sum + (task.storyPoints ?? 0),
    0,
  )
  const ownerOptions = [board.creator, board.owner, ...board.associated].filter(
    (id, index, all) => all.indexOf(id) === index,
  )

  return (
    <Tooltip.Provider delayDuration={0}>
      <main className="min-h-screen bg-void font-matrix text-xenon">
        <header className="flex items-center justify-between border-b border-xenon px-6 py-3">
          <div className="flex items-center gap-4 text-sm">
            <Link to="/boards" className="hover:bg-xenon/10">
              {'<'} BACK
            </Link>
            <span className="opacity-70">BOARDS /</span>
            <span className="font-bold tracking-widest">{board.title.toUpperCase()}</span>
          </div>
          <button
            type="button"
            onClick={handleSwitchUser}
            className="border border-xenon px-2 py-1 font-bold tracking-widest hover:bg-xenon/10"
          >
            SWITCH USER
          </button>
        </header>

        <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
          <section className="min-w-0 flex-1">
            <h1 className="text-4xl font-bold tracking-widest">
              <InlineEdit
                value={board.title}
                displayText={board.title.toUpperCase()}
                editable={isManager && !frozen}
                inputLabel="Board title"
                validate={(value) => (value.trim().length === 0 ? 'Title is required.' : null)}
                onSave={handleTitleSave}
                displayClassName="block w-full cursor-text border-none bg-transparent p-0 text-left font-bold tracking-widest outline-none hover:bg-xenon/10"
                inputClassName="block w-full border border-xenon bg-transparent px-2 py-1 text-4xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-xenon"
              />
            </h1>
            <InlineEdit
              value={board.description}
              displayText={
                board.description.trim().length > 0 ? board.description : '(no description)'
              }
              editable={isManager}
              inputLabel="Board description"
              placeholder="(no description)"
              onSave={handleDescriptionSave}
              displayClassName="mt-2 block w-full cursor-text border-none bg-transparent p-0 text-left text-sm opacity-70"
              inputClassName="mt-2 block w-full border border-xenon bg-transparent px-2 py-1 text-sm opacity-100 focus:ring-2 focus:ring-xenon"
            />
            <p data-testid="board-effort-summary" className="mt-2 text-xs tracking-widest opacity-70">
              TOTAL: {totalPoints} PTS - IN PROGRESS: {inProgressTasks.length} TASKS (
              {inProgressPoints} PTS)
            </p>

            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={frozen}
                  onClick={() => setModalOpen(true)}
                  aria-label="New task"
                  className="border border-xenon px-3 py-1 font-bold tracking-widest hover:bg-xenon/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + NEW TASK
                </button>
                {panelError !== null && (
                  <span role="alert" className="text-sm tracking-widest">
                    ERR: {panelError}
                  </span>
                )}
              </div>
              <div className="relative w-64 shrink-0">
                <input
                  type="text"
                  value={taskQuery}
                  onChange={(event) => setTaskQuery(event.target.value)}
                  placeholder="Search tasks..."
                  aria-label="Search tasks"
                  className="w-full border border-xenon bg-transparent px-3 py-1 caret-xenon outline-none placeholder:text-xenon/40 focus:ring-2 focus:ring-xenon"
                />
                {taskQuery.length > 0 && (
                  <button
                    type="button"
                    aria-label="Clear task search"
                    onClick={() => setTaskQuery('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 font-bold hover:bg-xenon/10"
                  >
                    x
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-3">
              {COLUMN_ORDER.map((state) => (
                <section key={state} aria-label={STATE_LABELS[state]}>
                  <h2 className="border-b border-xenon pb-1 text-xs font-bold tracking-widest opacity-80">
                    {STATE_LABELS[state]}{' '}
                    <span className="opacity-60">
                      ({board.tasks.filter((task) => task.state === state).length})
                    </span>
                  </h2>
                  <ul className="mt-2 flex flex-col gap-2">
                    {board.tasks
                      .map((task, index) => ({ task, index }))
                      .filter(({ task }) => taskMatchesQuery(task, members, taskQuery))
                      .filter(({ task }) => task.state === state)
                      .sort(
                        (a, b) =>
                          (PRIORITY_WEIGHT[a.task.priority ?? 'medium'] -
                            PRIORITY_WEIGHT[b.task.priority ?? 'medium']) ||
                          a.index - b.index,
                      )
                      .map(({ task }) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          members={members}
                          moves={taskMoves.get(task.id) ?? []}
                          movesFailed={failedTaskMoves.has(task.id)}
                          onMoved={handleTaskMove}
                          editable={canEditTask(task)}
                          onEdit={setEditingTask}
                        />
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>

          <aside className="w-60 shrink-0">
            <div className="flex flex-col gap-3 border border-xenon p-4 text-sm">
              <p>
                <span className="text-xs tracking-widest opacity-70">CREATOR</span>
                <span className="block truncate">{creatorEmail}</span>
              </p>
              <p>
                <span className="text-xs tracking-widest opacity-70">OWNER</span>
                {isManager && !frozen ? (
                  <Select.Root
                    value={board.owner}
                    onValueChange={(next) => handleOwnerChange(next as UserId)}
                  >
                    <Tooltip.Root delayDuration={0}>
                      <Tooltip.Trigger asChild>
                        <Select.Trigger
                          aria-label="Board owner"
                          className="mt-2 flex w-full items-center justify-between border border-xenon bg-transparent px-2 py-1.5 text-sm tracking-widest outline-none focus:ring-2 focus:ring-xenon aria-disabled:cursor-not-allowed truncate"
                        >
                          <Select.Value />
                        </Select.Trigger>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="bottom"
                          className="border border-xenon bg-void px-2 py-1 text-xs tracking-widest text-xenon"
                        >
                          {ownerEmail}
                          <Tooltip.Arrow className="fill-xenon" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                    <Select.Portal>
                      <Select.Content
                        position="popper"
                        className="min-w-[12rem] border border-xenon bg-void p-1 text-xenon"
                      >
                        <Select.Viewport>
                          <Select.Item
                            value={board.owner}
                            disabled
                            className="px-2 py-1 text-sm tracking-widest opacity-50"
                          >
                            <Select.ItemText>{ownerEmail}</Select.ItemText>
                          </Select.Item>
                          {ownerOptions
                            .filter((id) => id !== board.owner)
                            .map((id) => (
                              <Select.Item
                                key={id}
                                value={id}
                                className="cursor-pointer px-2 py-1 text-sm tracking-widest outline-none data-[highlighted]:bg-xenon data-[highlighted]:text-void"
                              >
                                <Select.ItemText>{members.get(id) ?? id}</Select.ItemText>
                              </Select.Item>
                            ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                ) : (
                  <span className="block truncate">{ownerEmail}</span>
                )}
              </p>

              <p>
                <span className="text-xs tracking-widest opacity-70">BOARD STATE</span>
                <Select.Root
                  value={board.state}
                  disabled={boardMoves.moves.length === 0}
                  onValueChange={(target) => handleBoardMove(target as LifecycleState)}
                >
                  <Select.Trigger
                    aria-label="Board state"
                    className="mt-2 flex w-full items-center justify-between border border-xenon bg-transparent px-2 py-1.5 text-sm tracking-widest outline-none focus:ring-2 focus:ring-xenon aria-disabled:cursor-not-allowed"
                  >
                    <Select.Value />
                    <Select.Icon>
                      <span className="opacity-70">v</span>
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      position="popper"
                      className="min-w-48 border border-xenon bg-void p-1 text-xenon"
                    >
                      <Select.Viewport>
                        <Select.Item
                          value={board.state}
                          disabled
                          className="px-2 py-1 text-sm tracking-widest opacity-50"
                        >
                          <Select.ItemText>{STATE_LABELS[board.state]}</Select.ItemText>
                        </Select.Item>
                        {boardMoves.moves
                          .filter((state) => state !== board.state)
                          .map((state) => (
                          <Select.Item
                            key={state}
                            value={state}
                            className="cursor-pointer px-2 py-1 text-sm tracking-widest outline-none data-highlighted:bg-xenon data-highlighted:text-void"
                          >
                            <Select.ItemText>{STATE_LABELS[state]}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </p>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-widest opacity-70">MEMBERS</span>
                  {isManager && !frozen && (
                    <button
                      type="button"
                      aria-label="Add member"
                      onClick={toggleMemberAdd}
                      className="border border-xenon px-1.5 font-bold leading-none hover:bg-xenon/10"
                    >
                      +
                    </button>
                  )}
                </div>
                <ul className="mt-2 flex flex-col gap-1">
                  {[board.creator, board.owner, ...board.associated]
                    .filter((id, index, all) => all.indexOf(id) === index)
                    .map((id) => {
                      const email = members.get(id) ?? id
                      const me = id === actorId
                      const removable = isManager && !frozen && board.associated.includes(id)
                      return (
                        <li
                          key={id}
                          className="group flex items-center justify-between gap-2 truncate"
                        >
                          <span className="truncate">
                            {email}
                            {me && <span className="opacity-70"> (you)</span>}
                          </span>
                          {removable && (
                            <button
                              type="button"
                              aria-label={`Remove ${email}`}
                              onClick={() => handleMemberRemoveClick(id)}
                              className="invisible shrink-0 border border-xenon px-1 text-xs font-bold leading-none opacity-0 hover:bg-xenon/10 group-hover:visible group-hover:opacity-100"
                            >
                              x
                            </button>
                          )}
                        </li>
                      )
                    })}
                </ul>
                {memberEntryOpen && (
                  <div
                    className="mt-2 flex flex-col gap-2"
                    onBlur={handleMemberAddBlur}
                    onKeyDown={handleMemberAddKeyDown}
                  >
                    <div className="flex gap-2">
                      <input
                        aria-label="Member email"
                        value={memberEmail}
                        onChange={(event) => handleMemberEmailChange(event.target.value)}
                        disabled={addBusy}
                        placeholder="email@example.com"
                        autoFocus
                        className="w-full min-w-0 border border-xenon bg-transparent px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-xenon"
                      />
                      <button
                        type="button"
                        aria-label="Confirm member"
                        disabled={addBusy}
                        onClick={() => void commitMember(null)}
                        className="border border-xenon px-2 text-xs font-bold tracking-widest hover:bg-xenon/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ADD
                      </button>
                    </div>
                    {memberSuggestions.length > 0 && (
                      <ul
                        role="listbox"
                        aria-label="Member suggestions"
                        className="border border-xenon"
                      >
                        {memberSuggestions.map((suggestion) => (
                          <li key={suggestion.id}>
                            <button
                              type="button"
                              role="option"
                              aria-label={`Add ${suggestion.email}`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => void commitMember(suggestion)}
                              className="block w-full truncate px-2 py-1 text-left text-xs hover:bg-xenon/10"
                            >
                              {suggestion.email}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {memberError !== null && (
                  <p role="alert" className="mt-2 text-xs tracking-widest">
                    ERR: {memberError}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {modalOpen && (
          <TaskModal
            boardId={board.id}
            actorId={actorId}
            isManager={isManager}
            members={members}
            onClose={() => setModalOpen(false)}
            onCreate={() => void loadBoard(false)}
          />
        )}

        {editingTask !== null && (
          <TaskModal
            boardId={board.id}
            actorId={actorId}
            isManager={isManager}
            members={members}
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onCreate={() => {
              setEditingTask(null)
              void loadBoard(false)
            }}
          />
        )}

        {removeTarget !== null && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Remove member"
            className="fixed inset-0 flex items-center justify-center bg-black/70 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeRemoveDialog()
              }
            }}
          >
            <div className="flex w-full max-w-sm flex-col gap-4 border-2 border-xenon bg-void p-6">
              <h2 className="text-xl font-bold tracking-widest">REMOVE MEMBER</h2>
              <p className="text-sm tracking-widest">
                {members.get(removeTarget) ?? removeTarget} has task(s) assigned, confirm delete
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void removeMemberById(removeTarget)}
                  className="flex-1 bg-xenon px-4 py-2 font-bold tracking-widest text-void hover:bg-xenon/80"
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={closeRemoveDialog}
                  className="flex-1 border border-xenon px-4 py-2 font-bold tracking-widest hover:bg-xenon/10"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Tooltip.Provider>
  )
}

export default BoardDetailPage