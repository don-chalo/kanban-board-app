import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LifecycleState, Task, UserId } from '../lib/api'
import BoardDetailPage from './BoardDetailPage'

const BASE = 'http://localhost:3000'

type BoardFixture = {
  id: string
  title: string
  description: string
  creator: UserId
  owner: UserId
  associated: UserId[]
  state: LifecycleState
  previousState: LifecycleState | null
  tasks: Task[]
}

function makeTask(id: string, title: string, state: LifecycleState, owner = 'user-2'): Task {
  return {
    id,
    boardId: 'board-1',
    creator: 'user-1',
    owner,
    title,
    description: '',
    state,
    previousState: null,
  }
}

function makeBoard(overrides: Partial<BoardFixture> = {}): BoardFixture {
  return {
    id: 'board-1',
    title: 'Alpha',
    description: '',
    creator: 'user-1',
    owner: 'user-1',
    associated: ['user-2'],
    state: 'ToDo',
    previousState: null,
    tasks: [makeTask('task-1', 'First', 'ToDo')],
    ...overrides,
  }
}

const MEMBERS: Record<UserId, string> = {
  'user-1': 'alice@example.com',
  'user-2': 'bob@example.com',
  'user-99': 'manager@example.com',
}

function stubApi(
  board: BoardFixture,
  opts: {
    boardMoves?: LifecycleState[]
    taskMoves?: Record<string, LifecycleState[]>
    taskActionsStatus?: number
    transitionsStatus?: number
    boardStateStatus?: number
    boardStateCode?: string
    boardStatus?: number
    membersStatus?: number
    boardPatchStatus?: number
    memberRemoveStatus?: number
    extraUsers?: Record<UserId, string>
  } = {},
) {
  let taskCounter = 0
  let resolveCounter = 0
  const boardMoves = opts.boardMoves ?? ['InProgress', 'Blocked', 'Cancelled']
  const taskMoves = opts.taskMoves ?? {}
  const userStore: Record<string, string> = { ...MEMBERS, ...opts.extraUsers }
  const TABLE = {
    transitions: {
      ToDo: ['InProgress', 'Cancelled'],
      InProgress: ['Done', 'Blocked', 'Cancelled'],
      Done: [],
      Cancelled: [],
      Blocked: ['InProgress'],
    },
    frozenStates: ['Blocked', 'Cancelled', 'Done'],
  }
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    const ok = (payload: unknown, status = 200) => ({ ok, status, json: async () => payload })

    if (url === `${BASE}/transitions` && method === 'GET') {
      if (opts.transitionsStatus !== undefined || opts.taskActionsStatus !== undefined) {
        return { ok: false, status: opts.transitionsStatus ?? opts.taskActionsStatus, json: async () => ({}) }
      }
      return ok(TABLE)
    }
    if (url === `${BASE}/users/batch` && method === 'POST') {
      const ids = (body.ids ?? []) as UserId[]
      return ok(
        [...new Set(ids)]
          .filter((id) => userStore[id] !== undefined)
          .map((id) => ({ id, email: userStore[id] })),
      )
    }
    if (url === `${BASE}/boards/${board.id}` && method === 'GET') {
      if (opts.boardStatus !== undefined) {
        return { ok: false, status: opts.boardStatus, json: async () => ({}) }
      }
      return ok(board)
    }
    if (url === `${BASE}/boards/${board.id}/actions`) {
      return ok(boardMoves)
    }
    if (url === `${BASE}/boards/${board.id}/state` && method === 'POST') {
      if (opts.boardStateStatus !== undefined) {
        return {
          ok: false,
          status: opts.boardStateStatus,
          json: async () => ({ error: { code: opts.boardStateCode ?? 'board_not_done', message: 'rejected' } }),
        }
      }
      board.state = body.target as LifecycleState
      return ok(board)
    }
    if (url === `${BASE}/boards/${board.id}` && method === 'PATCH') {
      if (opts.boardPatchStatus !== undefined) {
        return { ok: false, status: opts.boardPatchStatus, json: async () => ({}) }
      }
      const next = { ...board }
      if (body.title !== undefined) {
        next.title = String(body.title)
      }
      if (body.description !== undefined) {
        next.description = String(body.description)
      }
      if (body.owner !== undefined) {
        next.owner = body.owner as UserId
        next.associated = (next.associated as UserId[]).filter((m) => m !== body.owner)
      }
      return ok(next)
    }
    if (url === `${BASE}/boards/${board.id}/members` && method === 'POST') {
      if (opts.membersStatus !== undefined) {
        return { ok: false, status: opts.membersStatus, json: async () => ({}) }
      }
      const member = String(body.member)
      if (!board.associated.includes(member as UserId)) {
        board.associated.push(member as UserId)
      }
      return ok(board)
    }
    const memberDeleteMatch = url.match(/\/boards\/([^/]+)\/members\/([^/]+)$/)
    if (memberDeleteMatch && method === 'DELETE') {
      if (opts.memberRemoveStatus !== undefined) {
        return { ok: false, status: opts.memberRemoveStatus, json: async () => ({}) }
      }
      const removed = { ...board, associated: board.associated.filter((m) => m !== memberDeleteMatch[2]) }
      ;(board as BoardFixture).associated = removed.associated
      return ok(removed)
    }
    if (url.startsWith(`${BASE}/users?email=`)) {
      const prefix = decodeURIComponent(url.split('?email=')[1] ?? '').toLowerCase()
      const matches = Object.entries(userStore)
        .filter(([, email]) => email.toLowerCase().startsWith(prefix))
        .map(([id, email]) => ({ id, email }))
        .slice(0, 8)
      return ok(matches)
    }
    if (url === `${BASE}/users/resolve` && method === 'POST') {
      const email = String(body.email).trim().toLowerCase()
      const existing = Object.entries(userStore).find(([, value]) => value === email)
      if (existing !== undefined) {
        return ok({ id: existing[0], email })
      }
      resolveCounter += 1
      const id = `resolved-${resolveCounter}`
      userStore[id] = email
      return ok({ id, email }, 201)
    }
    const taskActionsMatch = url.match(/\/boards\/[^/]+\/tasks\/([^/]+)\/actions$/)
    if (taskActionsMatch) {
      if (opts.taskActionsStatus !== undefined) {
        return { ok: false, status: opts.taskActionsStatus, json: async () => ({}) }
      }
      return ok(taskMoves[taskActionsMatch[1]] ?? ['InProgress', 'Blocked', 'Cancelled'])
    }
    if (url === `${BASE}/boards/${board.id}/tasks` && method === 'POST') {
      taskCounter += 1
      const task = makeTask(`task-new-${taskCounter}`, body.title, 'ToDo', 'user-1')
      board.tasks.push(task)
      return ok(task, 201)
    }
    const taskStateMatch = url.match(/\/boards\/[^/]+\/tasks\/([^/]+)\/state$/)
    if (taskStateMatch && method === 'POST') {
      const task = board.tasks.find((t) => t.id === taskStateMatch[1])
      if (task !== undefined) {
        task.state = body.target as LifecycleState
      }
      return ok(task ?? {})
    }
    const taskOwnerMatch = url.match(/\/boards\/[^/]+\/tasks\/([^/]+)\/owner$/)
    if (taskOwnerMatch && method === 'POST') {
      const task = board.tasks.find((t) => t.id === taskOwnerMatch[1])
      if (task !== undefined) {
        task.owner = body.owner as UserId
      }
      return ok(task ?? {})
    }
    const taskPatchMatch = url.match(/\/boards\/[^/]+\/tasks\/([^/]+)$/)
    if (taskPatchMatch && method === 'PATCH') {
      const task = board.tasks.find((t) => t.id === taskPatchMatch[1])
      if (task !== undefined) {
        if (body.title !== undefined) {
          task.title = String(body.title)
        }
        if (body.description !== undefined) {
          task.description = String(body.description)
        }
        return ok(task)
      }
      return { ok: false, status: 404, json: async () => ({}) }
    }
    const usersMatch = url.match(/\/users\/([^/]+)$/)
    if (usersMatch && method === 'GET') {
      const email = userStore[usersMatch[1]]
      if (email === undefined) {
        return { ok: false, status: 404, json: async () => ({}) }
      }
      return ok({ id: usersMatch[1], email })
    }
    return ok({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

let container: HTMLDivElement
let root: Root

function renderPage() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/boards/board-1']}>
        <Routes>
          <Route path="/login" element={<div id="login-marker">login</div>} />
          <Route path="/boards/:boardId" element={<BoardDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  })
}

async function flush() {
  await act(async () => {})
}

function taskArrow(title: string) {
  const el = container.querySelector(`[aria-label="Move task ${title}"]`)
  if (el === null) {
    throw new Error(`arrow for task ${title} not found`)
  }
  return el
}

async function openSelect(ariaLabel: string) {
  const trigger = container.querySelector(`[aria-label="${ariaLabel}"]`)
  if (trigger === null) {
    throw new Error(`${ariaLabel} trigger not found`)
  }
  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

async function pickOption(label: string) {
  const option = Array.from(document.body.querySelectorAll('[role="option"]')).find((el) =>
    el.textContent?.includes(label),
  )
  if (option === undefined) {
    throw new Error(`option ${label} not found`)
  }
  act(() => {
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

function section(state: string) {
  return container.querySelector(`section[aria-label="${state}"]`)
}

function addMemberButton(): HTMLButtonElement {
  const el = container.querySelector('[aria-label="Add member"]')
  if (el === null) {
    throw new Error('add member button not found')
  }
  return el as HTMLButtonElement
}

function memberEmailInput(): HTMLInputElement {
  const el = container.querySelector('[aria-label="Member email"]')
  if (el === null) {
    throw new Error('member email input not found')
  }
  return el as HTMLInputElement
}

function typeMemberEmail(value: string) {
  const input = memberEmailInput()
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function debounceSearch() {
  await act(async () => {
    vi.advanceTimersByTime(250)
  })
  await flush()
}

async function openMemberEntry() {
  act(() => {
    addMemberButton().click()
  })
  await flush()
}

function titleEditButton(): HTMLButtonElement {
  const el = container.querySelector('[aria-label="Edit Board title"]')
  if (el === null) {
    throw new Error('title edit button not found')
  }
  return el as HTMLButtonElement
}

function descriptionEditButton(): HTMLButtonElement {
  const el = container.querySelector('[aria-label="Edit Board description"]')
  if (el === null) {
    throw new Error('description edit button not found')
  }
  return el as HTMLButtonElement
}

function boardTitleInput(): HTMLInputElement {
  const el = container.querySelector('[aria-label="Board title"]')
  if (el === null) {
    throw new Error('board title input not found')
  }
  return el as HTMLInputElement
}

function boardDescriptionInput(): HTMLInputElement {
  const el = container.querySelector('[aria-label="Board description"]')
  if (el === null) {
    throw new Error('board description input not found')
  }
  return el as HTMLInputElement
}

function typeBoardField(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function boardPatchCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(
    ([url, init]) => String(url).endsWith('/boards/board-1') && init?.method === 'PATCH',
  )
}

beforeEach(() => {
  localStorage.setItem('todo.identity', JSON.stringify({ id: 'user-1', email: 'alice@example.com' }))
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('BoardDetailPage', () => {
  it('shows a loading state while the board is being fetched', () => {
    const never = new Promise(() => {})
    vi.stubGlobal('fetch', vi.fn(() => never))
    renderPage()

    expect(container.textContent).toContain('LOADING BOARD...')
  })

  it('renders the title, the empty-description placeholder, and the identity panel', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    expect(container.textContent).toContain('ALPHA')
    expect(container.textContent).toContain('(no description)')
    expect(container.textContent).toContain('alice@example.com')
    expect(container.textContent).toContain('bob@example.com')
    expect(container.textContent).toContain('(you)')
  })

  it('shows the description when present', async () => {
    stubApi(makeBoard({ description: 'A board about alpha' }))
    renderPage()
    await flush()

    expect(container.textContent).toContain('A board about alpha')
    expect(container.textContent).not.toContain('(no description)')
  })

  it('clears the session and redirects to login on a 401 response', async () => {
    stubApi(makeBoard(), { boardStatus: 401 })
    renderPage()
    await flush()

    expect(localStorage.getItem('todo.identity')).toBeNull()
    expect(container.querySelector('#login-marker')).not.toBeNull()
  })

  it('shows an error message when the board request fails', async () => {
    stubApi(makeBoard(), { boardStatus: 500 })
    renderPage()
    await flush()

    expect(container.textContent).toContain('ERR: Could not load the board.')
  })

  it('offers only legal moves alongside the pinned current state', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    const trigger = container.querySelector('[aria-label="Board state"]')
    expect(trigger?.textContent).toContain('TO DO')

    await openSelect('Board state')

    const options = Array.from(document.body.querySelectorAll('[role="option"]')).map((el) =>
      el.textContent ?? '',
    )
    expect(options).toContain('TO DO')
    expect(options).toContain('IN PROGRESS')
    expect(options).toContain('CANCELLED')
    expect(options).not.toContain('BLOCKED')
    expect(options).not.toContain('DONE')
  })

  it('offers Done optimistically on an In Progress board', async () => {
    stubApi(makeBoard({ state: 'InProgress' }))
    renderPage()
    await flush()

    await openSelect('Board state')

    const options = Array.from(document.body.querySelectorAll('[role="option"]')).map((el) =>
      el.textContent ?? '',
    )
    expect(options).toContain('DONE')
    expect(options).toContain('BLOCKED')
    expect(options).toContain('CANCELLED')
  })

  it('explains the Done gate when the board move is rejected', async () => {
    stubApi(makeBoard({ state: 'InProgress' }), { boardStateStatus: 409, boardStateCode: 'board_not_done' })
    renderPage()
    await flush()

    await openSelect('Board state')
    await pickOption('DONE')

    expect(container.textContent).toContain('Board cannot be Done while tasks remain.')
  })

  it('applies a board move and refreshes the shown state', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    await openSelect('Board state')
    await pickOption('IN PROGRESS')

    const trigger = container.querySelector('[aria-label="Board state"]')
    expect(trigger?.textContent).toContain('IN PROGRESS')
  })

  it('locks and shows the state on a terminal board', async () => {
    stubApi(makeBoard({ state: 'Cancelled' }), { boardMoves: [] })
    renderPage()
    await flush()

    const trigger = container.querySelector('[aria-label="Board state"]')
    expect(trigger?.textContent).toContain('CANCELLED')
    expect(trigger?.getAttribute('disabled')).not.toBeNull()
  })

  it('groups tasks into the five state columns', async () => {
    stubApi(
      makeBoard({
        tasks: [
          makeTask('task-1', 'First', 'ToDo'),
          makeTask('task-2', 'Second', 'InProgress'),
        ],
      }),
    )
    renderPage()
    await flush()

    const labels = ['TO DO', 'IN PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED']
    for (const label of labels) {
      expect(section(label)).not.toBeNull()
    }
    expect(section('TO DO')?.textContent).toContain('FIRST')
    expect(section('TO DO')?.textContent).not.toContain('SECOND')
    expect(section('IN PROGRESS')?.textContent).toContain('SECOND')
  })

  it('shows per-column task counts including zero', async () => {
    stubApi(
      makeBoard({
        tasks: [
          makeTask('task-1', 'First', 'ToDo'),
          makeTask('task-2', 'Second', 'ToDo'),
          makeTask('task-3', 'Third', 'Done'),
        ],
      }),
    )
    renderPage()
    await flush()

    expect(section('TO DO')?.textContent).toContain('(2)')
    expect(section('DONE')?.textContent).toContain('(1)')
    expect(section('IN PROGRESS')?.textContent).toContain('(0)')
    expect(section('BLOCKED')?.textContent).toContain('(0)')
    expect(section('CANCELLED')?.textContent).toContain('(0)')
    const toDoHeading = section('TO DO')?.querySelector('h2')
    expect(toDoHeading?.querySelector('span.opacity-60')?.textContent).toContain('(2)')
  })

  it('moves a task through its arrow and relocates the card', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    await openSelect('Move task First')
    await pickOption('IN PROGRESS')

    const toDo = section('TO DO')
    const inProgress = section('IN PROGRESS')
    expect(toDo?.textContent).not.toContain('FIRST')
    expect(inProgress?.textContent).toContain('FIRST')
  })

  it('hides a task arrow when no moves are legal', async () => {
    stubApi(makeBoard({ tasks: [makeTask('task-1', 'First', 'Done')] }))
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Move task First"]')).toBeNull()
  })

  it('shows a disabled task arrow when the moves lookup failed', async () => {
    stubApi(makeBoard(), { transitionsStatus: 500 })
    renderPage()
    await flush()

    expect(taskArrow('First').getAttribute('disabled')).not.toBeNull()
  })

  describe('task search', () => {
    const searchableBoard = () =>
      makeBoard({
        tasks: [
          { ...makeTask('task-1', 'First', 'ToDo', 'user-2'), description: 'alpha details' },
          makeTask('task-2', 'Second', 'InProgress', 'user-1'),
          { ...makeTask('task-3', 'Third', 'Done', 'user-2'), description: 'beta notes' },
        ],
      })

    function setSearch(value: string) {
      const input = container.querySelector('input[aria-label="Search tasks"]')
      if (input === null) {
        throw new Error('search input not found')
      }
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    async function search(value: string) {
      act(() => {
        setSearch(value)
      })
      await flush()
    }

    it('renders the search field next to the new-task action', async () => {
      stubApi(searchableBoard())
      renderPage()
      await flush()

      expect(container.querySelector('input[aria-label="Search tasks"]')).not.toBeNull()
      expect(container.querySelector('[aria-label="Clear task search"]')).toBeNull()
    })

    it('filters cards by title substring', async () => {
      stubApi(searchableBoard())
      renderPage()
      await flush()

      await search('second')

      expect(section('TO DO')?.textContent).not.toContain('FIRST')
      expect(section('IN PROGRESS')?.textContent).toContain('SECOND')
      expect(section('DONE')?.textContent).not.toContain('THIRD')
    })

    it('filters cards by description', async () => {
      stubApi(searchableBoard())
      renderPage()
      await flush()

      await search('beta')

      expect(section('DONE')?.textContent).toContain('THIRD')
      expect(section('TO DO')?.textContent).not.toContain('FIRST')
      expect(section('IN PROGRESS')?.textContent).not.toContain('SECOND')
    })

    it('matches case-insensitively', async () => {
      stubApi(searchableBoard())
      renderPage()
      await flush()

      await search('FIRST')

      expect(section('TO DO')?.textContent).toContain('FIRST')
      expect(section('IN PROGRESS')?.textContent).not.toContain('SECOND')
    })

    it('matches owner email', async () => {
      stubApi(searchableBoard())
      renderPage()
      await flush()

      await search('bob@')

      expect(section('TO DO')?.textContent).toContain('FIRST')
      expect(section('DONE')?.textContent).toContain('THIRD')
      expect(section('IN PROGRESS')?.textContent).not.toContain('SECOND')
    })

    it('matches state labels', async () => {
      stubApi(searchableBoard())
      renderPage()
      await flush()

      await search('done')

      expect(section('DONE')?.textContent).toContain('THIRD')
      expect(section('TO DO')?.textContent).not.toContain('FIRST')
    })

    it('clearing restores all cards', async () => {
      stubApi(searchableBoard())
      renderPage()
      await flush()

      await search('second')
      expect(section('TO DO')?.textContent).not.toContain('FIRST')

      const clear = container.querySelector('[aria-label="Clear task search"]')
      if (clear === null) {
        throw new Error('clear search button not found')
      }
      act(() => {
        ;(clear as HTMLButtonElement).click()
      })
      await flush()

      expect(section('TO DO')?.textContent).toContain('FIRST')
      expect(section('IN PROGRESS')?.textContent).toContain('SECOND')
      expect(section('DONE')?.textContent).toContain('THIRD')
      expect(container.querySelector('[aria-label="Clear task search"]')).toBeNull()
    })

    it('keeps column counts on totals while filtering', async () => {
      stubApi(searchableBoard())
      renderPage()
      await flush()

      await search('second')

      expect(section('TO DO')?.textContent).toContain('(1)')
      expect(section('IN PROGRESS')?.textContent).toContain('(1)')
      expect(section('DONE')?.textContent).toContain('(1)')
    })
  })

  it('renders a frozen board read-only: new task disabled and no task arrows', async () => {
    stubApi(makeBoard({ state: 'Blocked' }))
    renderPage()
    await flush()

    const newTask = container.querySelector('[aria-label="New task"]')
    expect(newTask?.getAttribute('disabled')).not.toBeNull()
    expect(container.querySelector('[aria-label="Move task First"]')).toBeNull()
  })

  it('locks the state select and creation on a done board', async () => {
    stubApi(makeBoard({ state: 'Done' }), { boardMoves: [], taskMoves: { 'task-1': [] } })
    renderPage()
    await flush()

    const newTask = container.querySelector('[aria-label="New task"]')
    expect(newTask?.getAttribute('disabled')).not.toBeNull()
    const trigger = container.querySelector('[aria-label="Board state"]')
    expect(trigger?.textContent).toContain('DONE')
    expect(trigger?.getAttribute('disabled')).not.toBeNull()
  })

  it('creates a task through the modal and shows it in the To Do column', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    const open = container.querySelector('[aria-label="New task"]')
    act(() => {
      ;(open as HTMLButtonElement).click()
    })
    await flush()

    const titleInput = container.querySelector('[aria-label="Task title"]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(titleInput, 'Shiny new task')
    titleInput?.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    const form = container.querySelector('form')
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()

    expect(section('TO DO')?.textContent).toContain('SHINY NEW TASK')
  })

  it('shows the owner field to managers and hides it for plain members', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    const open = container.querySelector('[aria-label="New task"]')
    act(() => {
      ;(open as HTMLButtonElement).click()
    })
    await flush()
    expect(container.querySelector('[aria-label="Task owner"]')).not.toBeNull()
  })

  it('hides the owner field when the actor is not the board creator or owner', async () => {
    stubApi(makeBoard({ creator: 'user-99', owner: 'user-99' }))
    renderPage()
    await flush()

    const open = container.querySelector('[aria-label="New task"]')
    act(() => {
      ;(open as HTMLButtonElement).click()
    })
    await flush()
    expect(container.querySelector('[aria-label="Task owner"]')).toBeNull()
  })

  it('shows the + add action to the board manager', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Add member"]')).not.toBeNull()
  })

  it('hides the + add action from plain members', async () => {
    stubApi(makeBoard({ creator: 'user-99', owner: 'user-99' }))
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Add member"]')).toBeNull()
  })

  it('hides the + add action on frozen boards', async () => {
    for (const state of ['Blocked', 'Cancelled', 'Done'] as const) {
      const localContainer = document.createElement('div')
      document.body.appendChild(localContainer)
      const localRoot = createRoot(localContainer)
      stubApi(makeBoard({ state }))
      act(() => {
        localRoot.render(
          <MemoryRouter initialEntries={['/boards/board-1']}>
            <Routes>
              <Route path="/boards/:boardId" element={<BoardDetailPage />} />
            </Routes>
          </MemoryRouter>,
        )
      })
      await flush()
      expect(localContainer.querySelector('[aria-label="Add member"]')).toBeNull()
      act(() => {
        localRoot.unmount()
      })
      localContainer.remove()
    }
  })

  it('shows the owner dropdown to a manager on a live board', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Board owner"]')).not.toBeNull()
  })

  it('shows the owner as plain text for a non-manager', async () => {
    stubApi(makeBoard({ creator: 'user-99', owner: 'user-99' }))
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Board owner"]')).toBeNull()
    expect(container.textContent).toContain('manager@example.com')
  })

  it('shows the owner as plain text on a frozen board', async () => {
    stubApi(makeBoard({ state: 'Done' }), { boardMoves: [] })
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Board owner"]')).toBeNull()
  })

  it('reassigns the owner through the dropdown', async () => {
    const fetchMock = stubApi(makeBoard())
    renderPage()
    await flush()

    await openSelect('Board owner')
    await pickOption('bob@example.com')

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/boards/board-1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ owner: 'user-2' }),
      }),
    )
    expect(container.querySelector('[aria-label="Board owner"]')?.textContent).toContain(
      'bob@example.com',
    )
  })

  it('surfaces an error when owner reassignment fails', async () => {
    stubApi(makeBoard(), { boardPatchStatus: 500 })
    renderPage()
    await flush()

    await openSelect('Board owner')
    await pickOption('bob@example.com')

    expect(container.textContent).toContain('ERR: Could not reassign the owner.')
  })

  it('renders autocomplete suggestions from the search results', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    await openMemberEntry()
    vi.useFakeTimers()
    act(() => {
      typeMemberEmail('bob@')
    })
    await debounceSearch()
    vi.useRealTimers()

    const suggestions = Array.from(container.querySelectorAll('[role="option"]')).map((el) =>
      el.textContent ?? '',
    )
    expect(suggestions).toContain('bob@example.com')
  })

  it('adds a fresh member, normalizing case and whitespace, posting and refetching', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board, { extraUsers: { 'user-3': 'carol@example.com' } })
    renderPage()
    await flush()

    await openMemberEntry()
    act(() => {
      typeMemberEmail('  CAROL@EXAMPLE.COM  ')
    })
    const confirm = container.querySelector('[aria-label="Confirm member"]') as HTMLButtonElement
    act(() => {
      confirm.click()
    })
    await flush()

    const resolveCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/users/resolve'))
    expect(JSON.parse(String(resolveCall?.[1]?.body))).toEqual({ email: 'carol@example.com' })
    const memberCall = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith('/members') && init?.method === 'POST',
    )
    expect(JSON.parse(String(memberCall?.[1]?.body))).toEqual({ member: 'user-3' })
    expect(memberEmailInput().value).toBe('')
    expect(container.textContent).toContain('carol@example.com')
  })

  it('adds a member by picking a suggestion without a resolve call', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board, { extraUsers: { 'user-3': 'carol@example.com' } })
    renderPage()
    await flush()

    await openMemberEntry()
    vi.useFakeTimers()
    act(() => {
      typeMemberEmail('carol@')
    })
    await debounceSearch()
    vi.useRealTimers()

    const suggestion = Array.from(container.querySelectorAll('[role="option"]')).find(
      (el) => el.textContent === 'carol@example.com',
    )
    expect(suggestion).not.toBeUndefined()
    act(() => {
      ;(suggestion as HTMLButtonElement).click()
    })
    await flush()

    const resolveCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/users/resolve'),
    )
    expect(resolveCalls).toHaveLength(0)
    const memberCall = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith('/members') && init?.method === 'POST',
    )
    expect(JSON.parse(String(memberCall?.[1]?.body))).toEqual({ member: 'user-3' })
    expect(container.textContent).toContain('carol@example.com')
  })

  it('rejects a duplicate member email locally without sending a request', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    await openMemberEntry()
    act(() => {
      typeMemberEmail('bob@example.com')
    })
    const confirm = container.querySelector('[aria-label="Confirm member"]') as HTMLButtonElement
    act(() => {
      confirm.click()
    })
    await flush()

    expect(container.textContent).toContain('Already a member.')
    expect(memberEmailInput().value).toBe('bob@example.com')
    const addCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        (String(url).includes('/users/resolve') || String(url).endsWith('/members')) &&
        init?.method === 'POST',
    )
    expect(addCalls).toHaveLength(0)
    expect(board.associated).toEqual(['user-2'])
  })

  it('surfaces an inline error when the add request fails', async () => {
    const board = makeBoard()
    stubApi(board, {
      extraUsers: { 'user-3': 'carol@example.com' },
      membersStatus: 400,
    })
    renderPage()
    await flush()

    await openMemberEntry()
    act(() => {
      typeMemberEmail('carol@example.com')
    })
    const confirm = container.querySelector('[aria-label="Confirm member"]') as HTMLButtonElement
    act(() => {
      confirm.click()
    })
    await flush()

    expect(container.textContent).toContain('Could not add the member.')
    expect(memberEmailInput().value).toBe('carol@example.com')
    expect(board.associated).toEqual(['user-2'])
  })

  it('surfaces a 409 read_only when adding on a frozen board and keeps input', async () => {
    const board = makeBoard()
    stubApi(board, {
      extraUsers: { 'user-3': 'carol@example.com' },
      membersStatus: 409,
    })
    renderPage()
    await flush()

    await openMemberEntry()
    act(() => {
      typeMemberEmail('carol@example.com')
    })
    const confirm = container.querySelector('[aria-label="Confirm member"]') as HTMLButtonElement
    act(() => {
      confirm.click()
    })
    await flush()

    expect(container.textContent).toContain('Could not add the member.')
    expect(memberEmailInput().value).toBe('carol@example.com')
  })

  it('cancels the entry on Escape without adding a member', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    await openMemberEntry()
    act(() => {
      typeMemberEmail('carol@example.com')
    })
    act(() => {
      memberEmailInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await flush()

    expect(container.querySelector('[aria-label="Member email"]')).toBeNull()
    const addCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        (String(url).includes('/users/resolve') || String(url).endsWith('/members')) &&
        init?.method === 'POST',
    )
    expect(addCalls).toHaveLength(0)
    expect(board.associated).toEqual(['user-2'])
  })

  it('lets a manager edit the title on Enter, updating the heading and breadcrumb locally', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    act(() => {
      titleEditButton().click()
    })
    await flush()
    act(() => {
      typeBoardField(boardTitleInput(), 'Beta')
    })
    act(() => {
      boardTitleInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await flush()

    const occurrences = ((container.textContent ?? '').match(/BETA/g) ?? []).length
    expect(occurrences).toBeGreaterThanOrEqual(2)
    const patchCalls = boardPatchCalls(fetchMock)
    expect(patchCalls).toHaveLength(1)
    expect(JSON.parse(String(patchCalls[0][1]?.body))).toEqual({ title: 'Beta' })
    const getCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url) === `${BASE}/boards/board-1` && (init?.method ?? 'GET') === 'GET',
    )
    expect(getCalls).toHaveLength(1)
  })

  it('lets a manager edit the description and shows the placeholder when cleared', async () => {
    const board = makeBoard({ description: 'Original text' })
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    act(() => {
      descriptionEditButton().click()
    })
    await flush()
    act(() => {
      typeBoardField(boardDescriptionInput(), '')
    })
    act(() => {
      boardDescriptionInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await flush()

    expect(container.textContent).toContain('(no description)')
    const patchCalls = boardPatchCalls(fetchMock)
    expect(patchCalls).toHaveLength(1)
    expect(JSON.parse(String(patchCalls[0][1]?.body))).toEqual({ description: '' })
  })

  it('rejects a blank title inline without sending a request', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    act(() => {
      titleEditButton().click()
    })
    await flush()
    act(() => {
      typeBoardField(boardTitleInput(), '   ')
    })
    act(() => {
      boardTitleInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await flush()

    expect(board.title).toBe('Alpha')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Title is required.')
    expect(boardPatchCalls(fetchMock)).toHaveLength(0)
  })

  it('cancels title and description editing on Escape and blur without a request', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    act(() => {
      titleEditButton().click()
    })
    await flush()
    act(() => {
      typeBoardField(boardTitleInput(), 'Gamma')
    })
    act(() => {
      boardTitleInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await flush()
    expect(boardPatchCalls(fetchMock)).toHaveLength(0)

    act(() => {
      titleEditButton().click()
    })
    await flush()
    act(() => {
      typeBoardField(boardTitleInput(), 'Delta')
    })
    act(() => {
      boardTitleInput().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    })
    await flush()
    expect(boardPatchCalls(fetchMock)).toHaveLength(0)
    expect(board.title).toBe('Alpha')
    expect(container.textContent).toContain('ALPHA')
  })

  it('shows a plain title and description for a non-manager', async () => {
    localStorage.setItem('todo.identity', JSON.stringify({ id: 'user-2', email: 'bob@example.com' }))
    stubApi(makeBoard({ description: 'A board about alpha' }))
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Edit Board title"]')).toBeNull()
    expect(container.querySelector('[aria-label="Edit Board description"]')).toBeNull()
    expect(container.textContent!).toContain('ALPHA')
    expect(container.textContent!).toContain('A board about alpha')
  })

  it('offers no title editing for a manager when the board is frozen but keeps description editable', async () => {
    for (const state of ['Blocked', 'Cancelled', 'Done'] as const) {
      const localContainer = document.createElement('div')
      document.body.appendChild(localContainer)
      const localRoot = createRoot(localContainer)
      stubApi(makeBoard({ state }))
      act(() => {
        localRoot.render(
          <MemoryRouter initialEntries={['/boards/board-1']}>
            <Routes>
              <Route path="/boards/:boardId" element={<BoardDetailPage />} />
            </Routes>
          </MemoryRouter>,
        )
      })
      await flush()

      expect(localContainer.querySelector('[aria-label="Edit Board title"]')).toBeNull()
      expect(localContainer.querySelector('[aria-label="Edit Board description"]')).not.toBeNull()
      act(() => {
        localRoot.unmount()
      })
      localContainer.remove()
    }
  })

  it('lets a manager edit the description on a frozen board', async () => {
    const board = makeBoard({ state: 'Blocked', description: 'Old' })
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Edit Board title"]')).toBeNull()
    expect(container.querySelector('[aria-label="Edit Board description"]')).not.toBeNull()
    act(() => {
      descriptionEditButton().click()
    })
    await flush()
    act(() => {
      typeBoardField(boardDescriptionInput(), 'New desc')
    })
    act(() => {
      boardDescriptionInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await flush()
    expect(container.textContent).toContain('New desc')
    const patchCalls = boardPatchCalls(fetchMock)
    expect(patchCalls).toHaveLength(1)
    expect(JSON.parse(String(patchCalls[0][1]?.body))).toEqual({ description: 'New desc' })
  })

  it('surfaces a save failure inline and leaves the displayed value unchanged', async () => {
    const board = makeBoard()
    stubApi(board, { boardPatchStatus: 500 })
    renderPage()
    await flush()

    act(() => {
      titleEditButton().click()
    })
    await flush()
    act(() => {
      typeBoardField(boardTitleInput(), 'Beta')
    })
    act(() => {
      boardTitleInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await flush()

    expect(board.title).toBe('Alpha')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Could not save.')
    expect(container.querySelector('[aria-label="Board title"]')).toBeNull()
    expect(container.textContent).toContain('ALPHA')
  })

  it('reveals a remove action on hover for associated members to a manager', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Remove bob@example.com"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Remove alice@example.com"]')).toBeNull()
  })

  it('shows no remove action for a non-manager', async () => {
    localStorage.setItem('todo.identity', JSON.stringify({ id: 'user-2', email: 'bob@example.com' }))
    stubApi(makeBoard())
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Remove bob@example.com"]')).toBeNull()
  })

  it('shows no remove action on a frozen board', async () => {
    stubApi(makeBoard({ state: 'Blocked' }))
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Remove bob@example.com"]')).toBeNull()
  })

  it('removes a member without tasks immediately', async () => {
    const board = makeBoard({ tasks: [makeTask('task-1', 'First', 'ToDo', 'user-1')] })
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    act(() => {
      const removeButton = container.querySelector('[aria-label="Remove bob@example.com"]') as HTMLButtonElement | null
      if (removeButton === null) {
        throw new Error('remove button not found')
      }
      removeButton.click()
    })
    await flush()

    expect(container.querySelector('[role="dialog"][aria-label="Remove member"]')).toBeNull()
    expect(container.querySelector('[aria-label="Remove bob@example.com"]')).toBeNull()
    const deleteCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith('/members/user-2') && init?.method === 'DELETE',
    )
    expect(deleteCalls).toHaveLength(1)
  })

  it('surfaces a removal failure without removing the member', async () => {
    const board = makeBoard({ tasks: [makeTask('task-1', 'First', 'ToDo', 'user-1')] })
    const fetchMock = stubApi(board, { memberRemoveStatus: 500 })
    renderPage()
    await flush()

    act(() => {
      const removeButton = container.querySelector('[aria-label="Remove bob@example.com"]') as HTMLButtonElement | null
      if (removeButton === null) {
        throw new Error('remove button not found')
      }
      removeButton.click()
    })
    await flush()

    expect(container.textContent).toContain('Could not remove the member.')
    expect(container.querySelector('[aria-label="Remove bob@example.com"]')).not.toBeNull()
    const deleteCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith('/members/user-2') && init?.method === 'DELETE',
    )
    expect(deleteCalls).toHaveLength(1)
  })

  it('asks for confirmation before removing a member who owns tasks', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    act(() => {
      const removeButton = container.querySelector('[aria-label="Remove bob@example.com"]') as HTMLButtonElement | null
      if (removeButton === null) {
        throw new Error('remove button not found')
      }
      removeButton.click()
    })
    await flush()

    const dialog = container.querySelector('[role="dialog"][aria-label="Remove member"]')
    expect(dialog?.textContent).toContain('bob@example.com has task(s) assigned, confirm delete')
    const deleteCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith('/members/user-2') && init?.method === 'DELETE',
    )
    expect(deleteCalls).toHaveLength(0)
  })

  it('keeps the member when the confirmation is cancelled', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    act(() => {
      const removeButton = container.querySelector('[aria-label="Remove bob@example.com"]') as HTMLButtonElement | null
      if (removeButton === null) {
        throw new Error('remove button not found')
      }
      removeButton.click()
    })
    await flush()

    const cancel = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'CANCEL',
    ) as HTMLButtonElement | undefined
    expect(cancel).toBeDefined()
    act(() => {
      cancel?.click()
    })
    await flush()

    expect(container.querySelector('[role="dialog"][aria-label="Remove member"]')).toBeNull()
    expect(container.querySelector('[aria-label="Remove bob@example.com"]')).not.toBeNull()
    const deleteCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith('/members/user-2') && init?.method === 'DELETE',
    )
    expect(deleteCalls).toHaveLength(0)
  })

  it('removes a task-owning member once confirmed with Yes', async () => {
    const board = makeBoard()
    const fetchMock = stubApi(board)
    renderPage()
    await flush()

    act(() => {
      const removeButton = container.querySelector('[aria-label="Remove bob@example.com"]') as HTMLButtonElement | null
      if (removeButton === null) {
        throw new Error('remove button not found')
      }
      removeButton.click()
    })
    await flush()

    const yes = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'YES',
    ) as HTMLButtonElement | undefined
    expect(yes).toBeDefined()
    act(() => {
      yes?.click()
    })
    await flush()

    expect(container.querySelector('[role="dialog"][aria-label="Remove member"]')).toBeNull()
    expect(container.querySelector('[aria-label="Remove bob@example.com"]')).toBeNull()
    const deleteCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith('/members/user-2') && init?.method === 'DELETE',
    )
    expect(deleteCalls).toHaveLength(1)
  })

  it('shows an edit button on tasks the actor may edit', async () => {
    stubApi(makeBoard())
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Edit task First"]')).not.toBeNull()
  })

  it('hides the edit button on tasks the non-manager actor does not own', async () => {
    localStorage.setItem(
      'todo.identity',
      JSON.stringify({ id: 'user-2', email: 'bob@example.com' }),
    )
    stubApi(
      makeBoard({
        creator: 'user-99',
        owner: 'user-99',
        tasks: [
          makeTask('task-1', 'Mine', 'ToDo', 'user-2'),
          makeTask('task-2', 'Theirs', 'ToDo', 'user-1'),
        ],
      }),
    )
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Edit task Mine"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Edit task Theirs"]')).toBeNull()
  })

  it('hides the edit button on frozen boards and terminal tasks', async () => {
    stubApi(
      makeBoard({
        state: 'Blocked',
        tasks: [makeTask('task-1', 'Done', 'Done'), makeTask('task-2', 'Open', 'ToDo')],
      }),
    )
    renderPage()
    await flush()

    expect(container.querySelector('[aria-label="Edit task Done"]')).toBeNull()
    expect(container.querySelector('[aria-label="Edit task Open"]')).toBeNull()
  })

  it('opens the edit dialog prefilled and saves the changes, closing and refetching', async () => {
    const fetchMock = stubApi(makeBoard())
    renderPage()
    await flush()

    const edit = container.querySelector('[aria-label="Edit task First"]')
    act(() => {
      ;(edit as HTMLButtonElement).click()
    })
    await flush()

    const dialog = container.querySelector('[role="dialog"][aria-label="Edit task"]')
    expect(dialog).not.toBeNull()
    expect(
      (dialog?.querySelector('[aria-label="Task title"]') as HTMLInputElement).value,
    ).toBe('First')
    const submit = Array.from(dialog?.querySelectorAll('button') ?? []).find(
      (button) => button.type === 'submit',
    )
    expect(submit?.textContent).toBe('> SAVE')

    const titleInput = dialog?.querySelector('[aria-label="Task title"]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(titleInput, 'Renamed')
    titleInput?.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    const form = dialog?.querySelector('form')
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()

    expect(container.querySelector('[role="dialog"][aria-label="Edit task"]')).toBeNull()
    expect(container.textContent).toContain('RENAMED')

    const patchCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url) === `${BASE}/boards/board-1/tasks/task-1` && init?.method === 'PATCH',
    )
    expect(patchCalls).toHaveLength(1)
    expect(JSON.parse(String(patchCalls[0][1]?.body)).title).toBe('Renamed')
    const getCalls = fetchMock.mock.calls.filter(([url]) => String(url) === `${BASE}/boards/board-1`)
    expect(getCalls.length).toBeGreaterThan(1)
  })

  it('hides the owner field in the edit dialog for a non-manager task owner', async () => {
    localStorage.setItem(
      'todo.identity',
      JSON.stringify({ id: 'user-2', email: 'bob@example.com' }),
    )
    stubApi(
      makeBoard({
        creator: 'user-99',
        owner: 'user-99',
        tasks: [makeTask('task-1', 'Mine', 'ToDo', 'user-2')],
      }),
    )
    renderPage()
    await flush()

    const edit = container.querySelector('[aria-label="Edit task Mine"]')
    act(() => {
      ;(edit as HTMLButtonElement).click()
    })
    await flush()

    expect(container.querySelector('[aria-label="Edit task Mine"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Task owner"]')).toBeNull()
  })
})