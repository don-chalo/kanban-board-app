import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BoardsPage from './BoardsPage'

const BASE = 'http://localhost:3000'

const board = {
  id: 'board-1',
  title: 'Alpha',
  description: '',
  creator: 'user-1',
  owner: 'user-1',
  associated: [],
  state: 'To Do',
  previousState: null,
  tasks: [],
  comments: [],
}

const USERS: Record<string, string> = {
  'user-1': 'alice@example.com',
  'user-2': 'bob@example.com',
  'user-3': 'carol@example.com',
}

function makeBoard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'board-x',
    title: 'Board',
    description: '',
    creator: 'user-1',
    owner: 'user-1',
    associated: [],
    state: 'ToDo',
    previousState: null,
    tasks: [],
    comments: [],
    ...overrides,
  }
}

function stubApi(boardList: unknown[], userStore: Record<string, string> = USERS) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const ok = (payload: unknown, status = 200) => ({ ok, status, json: async () => payload })
    if (url === `${BASE}/boards` && method === 'GET') {
      return ok(boardList)
    }
    if (url.startsWith(`${BASE}/users?email=`)) {
      const prefix = decodeURIComponent(url.split('?email=')[1] ?? '').toLowerCase()
      const matches = Object.entries(userStore)
        .filter(([, email]) => email.toLowerCase().startsWith(prefix))
        .map(([id, email]) => ({ id, email }))
        .slice(0, 8)
      return ok(matches)
    }
    const userMatch = url.match(/\/users\/([^/]+)$/)
    if (userMatch && method === 'GET') {
      const email = userStore[userMatch[1]]
      if (email === undefined) {
        return { ok: false, status: 404, json: async () => ({}) }
      }
      return ok({ id: userMatch[1], email })
    }
    return ok({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location-search">{location.search}</span>
}

let container: HTMLDivElement
let root: Root

function renderUi(entries: string[] = ['/boards']) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <MemoryRouter initialEntries={entries}>
        <Routes>
          <Route path="/login" element={<div id="login-marker">login</div>} />
          <Route
            path="/boards"
            element={
              <>
                <BoardsPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
  })
}

function deferred() {
  let resolve!: (value: unknown) => void
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

async function flush() {
  await act(async () => {})
}

function mockResponse(ok: boolean, status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    }),
  )
}

function setTitle(value: string) {
  const input = container.querySelector('input[aria-label="Board title"]')
  if (input === null) {
    throw new Error('title input not found')
  }
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function submit() {
  const form = container.querySelector('form')
  if (form === null) {
    throw new Error('form not found')
  }
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await flush()
}

function switchUserButton() {
  const button = Array.from(container.querySelectorAll('button')).find((el) =>
    el.textContent?.includes('SWITCH USER'),
  )
  if (button === undefined) {
    throw new Error('switch user button not found')
  }
  return button
}

beforeEach(() => {
  localStorage.setItem('todo.identity', JSON.stringify({ id: 'user-1', email: 'alice@example.com' }))
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('BoardsPage', () => {
  it('shows a loading state while boards are being fetched', () => {
    vi.stubGlobal('fetch', vi.fn(() => deferred().promise))
    renderUi()

    expect(container.textContent).toContain('LOADING BOARDS...')
  })

  it('shows an empty state when the user has no boards', async () => {
    await mockResponse(true, 200, [])
    renderUi()
    await flush()

    expect(container.textContent).toContain('NO BOARDS')
  })

  it('renders the member boards with state and ownership marker', async () => {
    await mockResponse(true, 200, [board])
    renderUi()
    await flush()

    expect(container.textContent).toContain('ALPHA')
    expect(container.textContent).toContain('TO DO')
    expect(container.textContent).toContain('YOU')
  })

  it('shows an error message when the list request fails', async () => {
    await mockResponse(false, 500)
    renderUi()
    await flush()

    expect(container.textContent).toContain('ERR: Could not load boards.')
  })

  it('clears the session and redirects to login on a 401 response', async () => {
    await mockResponse(false, 401)
    renderUi()
    await flush()

    expect(localStorage.getItem('todo.identity')).toBeNull()
    expect(container.querySelector('#login-marker')).not.toBeNull()
  })

  it('rejects a blank title without sending a request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    renderUi()
    await flush()

    await submit()

    expect(container.textContent).toContain('ERR: Board title is required.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('creates a board and appends it to the list', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => board })
    vi.stubGlobal('fetch', fetchMock)
    renderUi()
    await flush()

    setTitle('  Alpha  ')
    await submit()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(container.textContent).toContain('ALPHA')
    expect(container.querySelector('input[aria-label="Board title"]')?.getAttribute('value')).toBe('')
  })

  it('shows an error when board creation fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    renderUi()
    await flush()

    setTitle('Beta')
    await submit()

    expect(container.textContent).toContain('ERR: Could not create the board.')
  })

  it('switches user by clearing the session and returning to login', async () => {
    await mockResponse(true, 200, [])
    renderUi()
    await flush()

    act(() => {
      switchUserButton().click()
    })
    await flush()

    expect(localStorage.getItem('todo.identity')).toBeNull()
    expect(container.querySelector('#login-marker')).not.toBeNull()
  })

  describe('filtering and sorting', () => {
    const boardsList = [
      makeBoard({ id: 'board-1', title: 'Gamma', state: 'Done', owner: 'user-2', creator: 'user-1' }),
      makeBoard({ id: 'board-2', title: 'Alpha', state: 'ToDo', owner: 'user-1', creator: 'user-1' }),
      makeBoard({ id: 'board-3', title: 'Beta', state: 'InProgress', owner: 'user-2', creator: 'user-3' }),
    ]

    function listedTitles(): string[] {
      return Array.from(container.querySelectorAll('ul li')).map((el) => el.textContent ?? '')
    }

    function stateChip(label: string): HTMLButtonElement {
      const el = container.querySelector(`button[aria-label="State filter ${label}"]`)
      if (el === null) {
        throw new Error(`state chip ${label} not found`)
      }
      return el as HTMLButtonElement
    }

    async function openSelect(ariaLabel: string) {
      const trigger = container.querySelector(`[aria-label="${ariaLabel}"]`)
      if (trigger === null) {
        throw new Error(`${ariaLabel} trigger not found`)
      }
      act(() => {
        ;(trigger as HTMLButtonElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      await flush()
    }

    async function pickOption(label: string) {
      const option = Array.from(document.body.querySelectorAll('[role="option"]')).find(
        (el) => el.textContent === label && el.getAttribute('aria-label') === null,
      )
      if (option === undefined) {
        throw new Error(`option ${label} not found`)
      }
      act(() => {
        ;(option as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      await flush()
    }

    function locationSearch(): string {
      return container.querySelector('[data-testid="location-search"]')?.textContent ?? ''
    }

    async function searchUserField(ariaLabel: string, prefix: string) {
      const input = container.querySelector(`input[aria-label="${ariaLabel}"]`)
      if (input === null) {
        throw new Error(`${ariaLabel} input not found`)
      }
      vi.useFakeTimers()
      try {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        setter?.call(input, prefix)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        await act(async () => {
          vi.advanceTimersByTime(250)
        })
        await flush()
      } finally {
        vi.useRealTimers()
      }
      await flush()
    }

    async function pickSuggestion(email: string) {
      const option = Array.from(container.querySelectorAll('[role="option"]')).find(
        (el) => el.textContent === email,
      )
      if (option === undefined) {
        throw new Error(`suggestion ${email} not found`)
      }
      act(() => {
        ;(option as HTMLButtonElement).click()
      })
      await flush()
    }

    it('filters boards by state', async () => {
      stubApi(boardsList)
      renderUi()
      await flush()

      act(() => {
        stateChip('DONE').click()
      })
      await flush()

      expect(container.textContent).not.toContain('GAMMA')
      expect(container.textContent).toContain('ALPHA')
      expect(container.textContent).toContain('BETA')
      expect(container.querySelector('[data-testid="boards-count"]')?.textContent).toContain(
        'SHOWING 2 OF 3',
      )
      expect(locationSearch()).toContain('states=')
      expect(locationSearch()).not.toContain('Done')
    })

    it('filters boards by owner through autocomplete', async () => {
      stubApi(boardsList)
      renderUi()
      await flush()

      await searchUserField('Filter by owner', 'bob@')
      await pickSuggestion('bob@example.com')

      expect(container.textContent).toContain('GAMMA')
      expect(container.textContent).toContain('BETA')
      expect(container.textContent).not.toContain('ALPHA')
      expect(container.textContent).toContain('bob@example.com')
      expect(locationSearch()).toContain('owner=user-2')
    })

    it('combines state and owner filters', async () => {
      stubApi(boardsList)
      renderUi()
      await flush()

      await searchUserField('Filter by owner', 'bob@')
      await pickSuggestion('bob@example.com')
      act(() => {
        stateChip('IN PROGRESS').click()
      })
      await flush()

      expect(container.textContent).toContain('GAMMA')
      expect(container.textContent).not.toContain('BETA')
      expect(container.textContent).not.toContain('ALPHA')
      expect(container.querySelector('[data-testid="boards-count"]')?.textContent).toContain(
        'SHOWING 1 OF 3',
      )
    })

    it('sorts by title in both directions', async () => {
      stubApi(boardsList)
      renderUi()
      await flush()

      expect(listedTitles()[0]).toContain('ALPHA')

      await openSelect('Sort direction')
      await pickOption('Desc')

      const titles = listedTitles()
      expect(titles[0]).toContain('GAMMA')
      expect(titles[2]).toContain('ALPHA')
    })

    it('sorts by canonical state order in both directions', async () => {
      stubApi(boardsList)
      renderUi()
      await flush()

      await openSelect('Sort field')
      await pickOption('State')

      const asc = listedTitles()
      expect(asc[0]).toContain('ALPHA')
      expect(asc[1]).toContain('BETA')
      expect(asc[2]).toContain('GAMMA')

      await openSelect('Sort direction')
      await pickOption('Desc')

      const desc = listedTitles()
      expect(desc[0]).toContain('GAMMA')
      expect(desc[2]).toContain('ALPHA')
    })

    it('clears all filters and sorting', async () => {
      stubApi(boardsList)
      renderUi()
      await flush()

      act(() => {
        stateChip('DONE').click()
      })
      await flush()
      await openSelect('Sort direction')
      await pickOption('Desc')

      const clear = container.querySelector('[aria-label="Clear filters"]')
      expect(clear).not.toBeNull()
      act(() => {
        ;(clear as HTMLButtonElement).click()
      })
      await flush()

      expect(container.textContent).toContain('GAMMA')
      expect(container.textContent).toContain('ALPHA')
      expect(container.textContent).toContain('BETA')
      expect(container.querySelector('[aria-label="Clear filters"]')).toBeNull()
      expect(locationSearch()).toBe('')
    })

    it('shows a filtered-empty state distinct from the no-boards state', async () => {
      stubApi(boardsList)
      renderUi()
      await flush()

      for (const label of ['TO DO', 'IN PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED']) {
        act(() => {
          stateChip(label).click()
        })
        await flush()
      }

      expect(container.textContent).toContain('NO BOARDS MATCH THE CURRENT FILTERS')
      expect(container.querySelector('[data-testid="boards-count"]')?.textContent).toContain(
        'SHOWING 0 OF 3',
      )
    })

    it('restores the view from the URL', async () => {
      stubApi(boardsList)
      renderUi(['/boards?states=Done&sort=title&dir=desc'])
      await flush()

      expect(container.textContent).toContain('GAMMA')
      expect(container.textContent).not.toContain('ALPHA')
      expect(container.textContent).not.toContain('BETA')
      expect(stateChip('DONE').getAttribute('aria-checked')).toBe('true')
      expect(stateChip('TO DO').getAttribute('aria-checked')).toBe('false')
    })

    it('resolves the owner label from the URL', async () => {
      stubApi(boardsList)
      renderUi(['/boards?owner=user-2'])
      await flush()

      expect(container.textContent).toContain('bob@example.com')
      expect(container.textContent).toContain('GAMMA')
      expect(container.textContent).toContain('BETA')
      expect(container.textContent).not.toContain('ALPHA')
    })
  })
})