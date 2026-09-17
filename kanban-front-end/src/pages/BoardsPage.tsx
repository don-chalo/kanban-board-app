import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  createBoard,
  getUser,
  listBoards,
  searchUsers,
  LIFECYCLE_STATES,
  type Board,
  type LifecycleState,
} from '../lib/api'
import { clearIdentity, readIdentity, type UserIdentity } from '../lib/session'
import { COLUMN_ORDER, STATE_LABELS } from '../lib/states'
import * as Checkbox from '@radix-ui/react-checkbox'
import * as Select from '@radix-ui/react-select'
import * as Tooltip from '@radix-ui/react-tooltip'

type SortField = 'title' | 'state'
type SortDir = 'asc' | 'desc'

const DEFAULT_SORT: SortField = 'title'
const DEFAULT_DIR: SortDir = 'asc'

function parseStatesParam(value: string | null): Set<LifecycleState> {
  if (value === null) {
    return new Set(LIFECYCLE_STATES)
  }
  const valid = value
    .split(',')
    .filter((s): s is LifecycleState => (LIFECYCLE_STATES as readonly string[]).includes(s))
  return new Set(valid)
}

function formatStates(states: Set<LifecycleState>): string {
  return LIFECYCLE_STATES.filter((state) => states.has(state)).join(',')
}

function BoardsPage() {
  const navigate = useNavigate()
  const identity = readIdentity()
  const [searchParams, setSearchParams] = useSearchParams()
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [ownerQuery, setOwnerQuery] = useState('')
  const [creatorQuery, setCreatorQuery] = useState('')
  const [ownerSuggestions, setOwnerSuggestions] = useState<UserIdentity[]>([])
  const [creatorSuggestions, setCreatorSuggestions] = useState<UserIdentity[]>([])
  const [ownerSel, setOwnerSel] = useState<UserIdentity | null>(null)
  const [creatorSel, setCreatorSel] = useState<UserIdentity | null>(null)

  const activeStates = useMemo(() => parseStatesParam(searchParams.get('states')), [searchParams])
  const ownerId = searchParams.get('owner')
  const creatorId = searchParams.get('creator')
  const sortField: SortField = searchParams.get('sort') === 'state' ? 'state' : 'title'
  const sortDir: SortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'

  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await listBoards()
      if (cancelled) {
        return
      }
      if (result.status === 'unauthorized') {
        clearIdentity()
        navigate('/login')
        return
      }
      if (result.status === 'error') {
        setListError('Could not load boards.')
        setLoading(false)
        return
      }
      setBoards(result.boards)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    if (ownerId === null) {
      setOwnerSel(null)
      return
    }
    let cancelled = false
    void getUser(ownerId)
      .then((user) => {
        if (!cancelled) {
          setOwnerSel(user ?? { id: ownerId, email: ownerId })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOwnerSel({ id: ownerId, email: ownerId })
        }
      })
    return () => {
      cancelled = true
    }
  }, [ownerId])

  useEffect(() => {
    if (creatorId === null) {
      setCreatorSel(null)
      return
    }
    let cancelled = false
    void getUser(creatorId)
      .then((user) => {
        if (!cancelled) {
          setCreatorSel(user ?? { id: creatorId, email: creatorId })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCreatorSel({ id: creatorId, email: creatorId })
        }
      })
    return () => {
      cancelled = true
    }
  }, [creatorId])

  useEffect(() => {
    const prefix = ownerQuery.trim()
    if (prefix.length === 0) {
      setOwnerSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      void searchUsers(prefix)
        .then(setOwnerSuggestions)
        .catch(() => setOwnerSuggestions([]))
    }, 200)
    return () => clearTimeout(timer)
  }, [ownerQuery])

  useEffect(() => {
    const prefix = creatorQuery.trim()
    if (prefix.length === 0) {
      setCreatorSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      void searchUsers(prefix)
        .then(setCreatorSuggestions)
        .catch(() => setCreatorSuggestions([]))
    }, 200)
    return () => clearTimeout(timer)
  }, [creatorQuery])

  const visibleBoards = useMemo(() => {
    if (boards === null) {
      return null
    }
    const unfilteredStates = activeStates.size === LIFECYCLE_STATES.length
    const filtered = boards.filter((board) => {
      const stateOk = unfilteredStates || activeStates.has(board.state)
      const ownerOk = ownerId === null || board.owner === ownerId
      const creatorOk = creatorId === null || board.creator === creatorId
      return stateOk && ownerOk && creatorOk
    })
    const sorted = [...filtered]
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortField === 'state') {
      sorted.sort((a, b) => mul * (COLUMN_ORDER.indexOf(a.state) - COLUMN_ORDER.indexOf(b.state)))
    } else {
      sorted.sort((a, b) => mul * a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    }
    return sorted
  }, [boards, activeStates, ownerId, creatorId, sortField, sortDir])

  const hasActive =
    activeStates.size !== LIFECYCLE_STATES.length ||
    ownerId !== null ||
    creatorId !== null ||
    sortField !== DEFAULT_SORT ||
    sortDir !== DEFAULT_DIR

  function writeParams(mutator: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams)
    mutator(next)
    setSearchParams(next, { replace: true })
  }

  function toggleState(state: LifecycleState) {
    writeParams((next) => {
      const current = parseStatesParam(next.get('states'))
      if (current.has(state)) {
        current.delete(state)
      } else {
        current.add(state)
      }
      if (current.size === LIFECYCLE_STATES.length) {
        next.delete('states')
      } else {
        next.set('states', formatStates(current))
      }
    })
  }

  function selectOwner(user: UserIdentity | null) {
    setOwnerSel(user)
    setOwnerQuery('')
    setOwnerSuggestions([])
    writeParams((next) => {
      if (user === null) {
        next.delete('owner')
      } else {
        next.set('owner', user.id)
      }
    })
  }

  function selectCreator(user: UserIdentity | null) {
    setCreatorSel(user)
    setCreatorQuery('')
    setCreatorSuggestions([])
    writeParams((next) => {
      if (user === null) {
        next.delete('creator')
      } else {
        next.set('creator', user.id)
      }
    })
  }

  function clearAll() {
    setOwnerQuery('')
    setCreatorQuery('')
    setOwnerSuggestions([])
    setCreatorSuggestions([])
    setOwnerSel(null)
    setCreatorSel(null)
    setSearchParams({}, { replace: true })
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = title.trim()
    if (value.length === 0) {
      setCreateError('Board title is required.')
      return
    }
    setCreateError(null)
    setCreating(true)
    try {
      const board = await createBoard(value)
      setBoards((prev) => (prev === null ? [board] : [...prev, board]))
      setTitle('')
    } catch {
      setCreateError('Could not create the board.')
    } finally {
      setCreating(false)
    }
  }

  function handleSwitchUser() {
    clearIdentity()
    navigate('/login')
  }

  function isMine(board: Board): boolean {
    return identity !== null && (board.creator === identity.id || board.owner === identity.id)
  }

  function renderUserField(
    kind: 'owner' | 'creator',
    query: string,
    setQuery: (value: string) => void,
    suggestions: UserIdentity[],
    selected: UserIdentity | null,
    onSelect: (user: UserIdentity | null) => void,
  ) {
    const label = kind === 'owner' ? 'Filter by owner' : 'Filter by creator'
    if (selected !== null) {
      return (
        <div className="flex min-w-0 items-center justify-between gap-2 border border-xenon px-3 py-2">
          <span className="truncate text-sm">{selected.email}</span>
          <button
            type="button"
            aria-label={`Clear ${kind} filter`}
            onClick={() => onSelect(null)}
            className="shrink-0 font-bold hover:bg-xenon/10"
          >
            x
          </button>
        </div>
      )
    }
    return (
      <div className="relative min-w-0">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={label}
          aria-label={label}
          className="w-full border border-xenon bg-transparent px-3 py-2 caret-xenon outline-none placeholder:text-xenon/40 focus:ring-2 focus:ring-xenon"
        />
        {suggestions.length > 0 && (
          <ul
            role="listbox"
            aria-label={`${label} suggestions`}
            className="absolute inset-x-0 top-full z-10 border border-xenon bg-void"
          >
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  aria-label={`Filter by ${suggestion.email}`}
                  onClick={() => onSelect(suggestion)}
                  className="block w-full truncate px-3 py-1 text-left text-sm hover:bg-xenon/10"
                >
                  {suggestion.email}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  let content
  if (loading) {
    content = <p className="mt-8 text-center tracking-widest">LOADING BOARDS...</p>
  } else if (listError !== null) {
    content = (
      <p className="mt-8 text-center tracking-widest">
        ERR: {listError}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-3 bg-xenon px-2 py-1 font-bold text-void hover:bg-xenon/80"
        >
          RETRY
        </button>
      </p>
    )
  } else if (boards === null || boards.length === 0) {
    content = <p className="mt-8 text-center tracking-widest">NO BOARDS. CREATE YOUR FIRST.</p>
  } else if (visibleBoards !== null && visibleBoards.length === 0) {
    content = (
      <p className="mt-8 text-center tracking-widest">NO BOARDS MATCH THE CURRENT FILTERS.</p>
    )
  } else {
    content = (
      <Tooltip.Provider delayDuration={0}>
        <ul className="mt-6 flex flex-col gap-3">
          {(visibleBoards ?? []).map((board) => (
            <li key={board.id}>
              <Link
                to={`/boards/${board.id}`}
                className="flex items-center gap-4 border border-xenon px-4 py-3 hover:bg-xenon/10"
              >
                <span className="border border-xenon px-2 py-0.5 text-xs tracking-widest">
                  {board.state.toUpperCase()}
                </span>
                <span className="shrink-0 font-bold tracking-widest">{board.title.toUpperCase()}</span>
                {
                  board.description?.trim().length > 0 && (
                    <Tooltip.Root delayDuration={0}>
                      <Tooltip.Trigger asChild>
                        <span className="min-w-0 flex-1 truncate text-sm font-normal normal-case opacity-70">
                          {board.description}
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="bottom"
                          className="max-w-xs border border-xenon bg-void px-2 py-1 text-xs text-xenon"
                        >
                          {board.description}
                          <Tooltip.Arrow className="fill-xenon" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  )
                }
                {isMine(board) && <span className="text-xs opacity-70">YOU</span>}
              </Link>
            </li>
          ))}
        </ul>
      </Tooltip.Provider>
      
    )
  }

  const showFilters = boards !== null && boards.length > 0

  return (
    <main className="min-h-screen bg-void font-matrix text-xenon">
      <header className="flex items-center justify-between border-b border-xenon px-6 py-3">
        <span className="font-bold tracking-widest">&gt; BOARDS</span>
        <div className="flex items-center gap-4 text-sm">
          {identity !== null && <span className="opacity-70">{identity.email}</span>}
          <button
            type="button"
            onClick={handleSwitchUser}
            className="border border-xenon px-2 py-1 font-bold tracking-widest hover:bg-xenon/10"
          >
            SWITCH USER
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-6">
        <form onSubmit={handleCreate} noValidate className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Board title"
            aria-label="Board title"
            className="flex-1 border border-xenon bg-transparent px-3 py-2 caret-xenon outline-none placeholder:text-xenon/40 focus:ring-2 focus:ring-xenon"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-xenon px-4 font-bold tracking-widest text-void hover:bg-xenon/80 disabled:opacity-50"
          >
            {creating ? 'CREATING...' : '> CREATE'}
          </button>
        </form>

        {createError !== null && (
          <p role="alert" className="mt-2 text-sm tracking-widest">
            ERR: {createError}
          </p>
        )}

        {showFilters && (
          <div className="mt-6 flex flex-col gap-3" aria-label="Board filters">
            <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filter by state">
              <span className="text-xs tracking-widest opacity-70">STATE:</span>
              {LIFECYCLE_STATES.map((state) => (
                <Checkbox.Root
                  key={state}
                  checked={activeStates.has(state)}
                  onCheckedChange={() => toggleState(state)}
                  aria-label={`State filter ${STATE_LABELS[state]}`}
                  className="group flex cursor-pointer items-center gap-2 border border-xenon px-2 py-1 text-xs tracking-widest outline-none hover:bg-xenon/10 focus-visible:ring-2 focus-visible:ring-xenon"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-4 items-center justify-center border border-xenon text-xs leading-none group-data-[state=checked]:bg-xenon group-data-[state=checked]:text-void"
                  >
                    <Checkbox.Indicator>✓</Checkbox.Indicator>
                  </span>
                  {STATE_LABELS[state]}
                </Checkbox.Root>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <span className="mb-1 block text-xs tracking-widest opacity-70">OWNER:</span>
                {renderUserField('owner', ownerQuery, setOwnerQuery, ownerSuggestions, ownerSel, selectOwner)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="mb-1 block text-xs tracking-widest opacity-70">CREATOR:</span>
                {renderUserField('creator', creatorQuery, setCreatorQuery, creatorSuggestions, creatorSel, selectCreator)}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs tracking-widest">
                <span className="opacity-70">SORT:</span>
                <Select.Root
                  value={sortField}
                  onValueChange={(value) =>
                    writeParams((next) => {
                      next.set('sort', value)
                    })
                  }
                >
                  <Select.Trigger
                    aria-label="Sort field"
                    className="flex items-center justify-between gap-2 border border-xenon bg-transparent px-2 py-1 text-xs tracking-widest outline-none hover:bg-xenon/10 focus-visible:ring-2 focus-visible:ring-xenon"
                  >
                    <Select.Value />
                    <Select.Icon>
                      <span className="opacity-70">v</span>
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      position="popper"
                      className="border border-xenon bg-void p-1 text-xs tracking-widest text-xenon"
                    >
                      <Select.Viewport>
                        <Select.Item
                          value="title"
                          className="cursor-pointer px-2 py-1 outline-none data-[highlighted]:bg-xenon data-[highlighted]:text-void"
                        >
                          <Select.ItemText>Title</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="state"
                          className="cursor-pointer px-2 py-1 outline-none data-[highlighted]:bg-xenon data-[highlighted]:text-void"
                        >
                          <Select.ItemText>State</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                <Select.Root
                  value={sortDir}
                  onValueChange={(value) =>
                    writeParams((next) => {
                      next.set('dir', value)
                    })
                  }
                >
                  <Select.Trigger
                    aria-label="Sort direction"
                    className="flex items-center justify-between gap-2 border border-xenon bg-transparent px-2 py-1 text-xs tracking-widest outline-none hover:bg-xenon/10 focus-visible:ring-2 focus-visible:ring-xenon"
                  >
                    <Select.Value />
                    <Select.Icon>
                      <span className="opacity-70">v</span>
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      position="popper"
                      className="border border-xenon bg-void p-1 text-xs tracking-widest text-xenon"
                    >
                      <Select.Viewport>
                        <Select.Item
                          value="asc"
                          className="cursor-pointer px-2 py-1 outline-none data-[highlighted]:bg-xenon data-[highlighted]:text-void"
                        >
                          <Select.ItemText>Asc</Select.ItemText>
                        </Select.Item>
                        <Select.Item
                          value="desc"
                          className="cursor-pointer px-2 py-1 outline-none data-[highlighted]:bg-xenon data-[highlighted]:text-void"
                        >
                          <Select.ItemText>Desc</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
              <div className="flex items-center gap-3 text-xs tracking-widest">
                <span data-testid="boards-count">
                  SHOWING {visibleBoards?.length ?? 0} OF {boards.length}
                </span>
                {hasActive && (
                  <button
                    type="button"
                    aria-label="Clear filters"
                    onClick={clearAll}
                    className="border border-xenon px-2 py-1 font-bold hover:bg-xenon/10"
                  >
                    x CLEAR
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {content}
      </section>
    </main>
  )
}

export default BoardsPage
