import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '../lib/api'
import TaskModal from './TaskModal'

let container: HTMLDivElement
let root: Root

function renderUi(
  props: Partial<{
    isManager: boolean
    members: Map<string, string>
    actorId: string
    task: Task
    editable: boolean
    onCreate: (taskId: string) => void
    onClose: () => void
  }> = {},
) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const onCreate = props.onCreate ?? vi.fn()
  const onClose = props.onClose ?? vi.fn()
  act(() => {
    root.render(
      <TaskModal
        boardId="board-1"
        actorId={props.actorId ?? 'user-1'}
        isManager={props.isManager ?? true}
        members={props.members ?? new Map([['user-2', 'bob@example.com']])}
        task={props.task}
        editable={props.editable}
        onClose={onClose}
        onCreate={onCreate}
      />,
    )
  })
  return { onCreate, onClose }
}

function input(label: string) {
  const el = container.querySelector(`[aria-label="${label}"]`)
  if (el === null) {
    throw new Error(`${label} input not found`)
  }
  return el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
}

function setValue(label: string, value: string) {
  const el = input(label)
  let setter: ((value: string) => void) | undefined
  if (el.tagName === 'TEXTAREA') {
    setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
  } else if (el.tagName === 'SELECT') {
    setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set
  } else {
    setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  }
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

async function submit() {
  const form = container.querySelector('form')
  if (form === null) {
    throw new Error('form not found')
  }
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
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

describe('TaskModal', () => {
  it('rejects a blank title without sending a request', async () => {
    const { onCreate } = renderUi()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await submit()

    expect(container.textContent).toContain('ERR: Task title is required.')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('creates a task with title and description and reports the created id', async () => {
    const { onCreate } = renderUi()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'task-9', title: 'X' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    setValue('Task title', '  Build login  ')
    setValue('Task description', '  Email field only  ')
    await submit()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/boards/board-1/tasks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Build login',
          description: 'Email field only',
          priority: 'medium',
          storyPoints: null,
        }),
      }),
    )
    expect(onCreate).toHaveBeenCalledWith('task-9')
  })

  it('creates then reassigns the owner when a manager picks one', async () => {
    const { onCreate } = renderUi()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 'task-9' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'task-9' }) })
    vi.stubGlobal('fetch', fetchMock)

    setValue('Task title', 'X')
    setValue('Task owner', 'user-2')
    await submit()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/boards/board-1/tasks',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/boards/board-1/tasks/task-9/owner',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ owner: 'user-2' }) }),
    )
    expect(onCreate).toHaveBeenCalledWith('task-9')
  })

  it('hides the owner field for non-managers and creates the task as themselves', async () => {
    const { onCreate } = renderUi({ isManager: false })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'task-9' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const ownerSelect = container.querySelector('[aria-label="Task owner"]')
    expect(ownerSelect).toBeNull()

    setValue('Task title', 'X')
    await submit()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith('task-9')
  })

  it('shows the owner options for managers', () => {
    renderUi({ isManager: true })
    const ownerSelect = container.querySelector('[aria-label="Task owner"]')
    expect(ownerSelect).not.toBeNull()
    expect(ownerSelect?.textContent).toContain('bob@example.com')
  })

  it('lists the creator, owner, and associated members as owner options with a (me) default', () => {
    renderUi({
      isManager: true,
      members: new Map([
        ['user-1', 'alice@example.com'],
        ['user-2', 'bob@example.com'],
        ['user-3', 'carol@example.com'],
      ]),
    })
    const ownerSelect = container.querySelector('[aria-label="Task owner"]')
    const labels = Array.from(ownerSelect?.querySelectorAll('option') ?? []).map(
      (option) => option.textContent ?? '',
    )
    expect(labels).toContain('(me)')
    expect(labels).toContain('bob@example.com')
    expect(labels).toContain('carol@example.com')
  })
})

describe('TaskModal edit mode', () => {
  const editedTask: Task = {
    id: 'task-1',
    boardId: 'board-1',
    creator: 'user-1',
    owner: 'user-2',
    title: 'First task',
    description: 'Some description',
    state: 'ToDo',
    previousState: null,
    comments: [],
  }

  it('renders with pre-filled values, an EDIT TASK heading, and a SAVE button', () => {
    renderUi({
      task: editedTask,
      members: new Map([
        ['user-1', 'alice@example.com'],
        ['user-2', 'bob@example.com'],
      ]),
    })

    expect(container.querySelector('[aria-label="Toggle task form"]')?.textContent).toContain(
      '> EDIT TASK',
    )
    expect((container.querySelector('[aria-label="Task title"]') as HTMLInputElement).value).toBe(
      'First task',
    )
    expect(
      (container.querySelector('[aria-label="Task description"]') as HTMLTextAreaElement).value,
    ).toBe('Some description')
    expect((container.querySelector('[aria-label="Task owner"]') as HTMLSelectElement).value).toBe(
      'user-2',
    )
    expect(
      Array.from(container.querySelectorAll('button')).find((button) => button.type === 'submit')
        ?.textContent,
    ).toBe('> SAVE')
  })

  it('hides the owner field for a non-manager who owns the task', () => {
    renderUi({
      isManager: false,
      task: { ...editedTask, creator: 'user-99' },
    })

    expect(container.querySelector('[aria-label="Task owner"]')).toBeNull()
  })

  it('rejects a blank title in edit mode without sending a request', async () => {
    renderUi({
      task: editedTask,
      members: new Map([
        ['user-1', 'alice@example.com'],
        ['user-2', 'bob@example.com'],
      ]),
    })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const titleInput = container.querySelector('[aria-label="Task title"]') as HTMLInputElement
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
      titleInput,
      '',
    )
    titleInput.dispatchEvent(new Event('input', { bubbles: true }))

    await submit()

    expect(container.textContent).toContain('ERR: Task title is required.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('patches the updated fields and reassigns the owner when changed', async () => {
    const onCreate = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...editedTask, title: 'New', description: 'New desc' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    renderUi({
      task: editedTask,
      members: new Map([
        ['user-1', 'alice@example.com'],
        ['user-2', 'bob@example.com'],
      ]),
      onCreate,
    })

    const titleInput = container.querySelector('[aria-label="Task title"]') as HTMLInputElement
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
      titleInput,
      'New',
    )
    titleInput.dispatchEvent(new Event('input', { bubbles: true }))
    const ownerSelect = container.querySelector('[aria-label="Task owner"]') as HTMLSelectElement
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set?.call(
      ownerSelect,
      'user-1',
    )
    ownerSelect.dispatchEvent(new Event('change', { bubbles: true }))

    await submit()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/boards/board-1/tasks/task-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'New', description: 'Some description' }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/boards/board-1/tasks/task-1/owner',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ owner: 'user-1' }) }),
    )
    expect(onCreate).toHaveBeenCalledWith('task-1')
  })

  it('skips the owner request when the manager leaves the owner unchanged', async () => {
    const onCreate = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...editedTask, description: 'Updated' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    renderUi({
      task: editedTask,
      members: new Map([
        ['user-1', 'alice@example.com'],
        ['user-2', 'bob@example.com'],
      ]),
      onCreate,
    })

    const descInput = container.querySelector('[aria-label="Task description"]') as HTMLTextAreaElement
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set?.call(
      descInput,
      'Updated',
    )
    descInput.dispatchEvent(new Event('input', { bubbles: true }))

    await submit()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith('task-1')
  })
})

describe('TaskModal task comments', () => {
  const MEMBERS = new Map([
    ['user-1', 'alice@example.com'],
    ['user-2', 'bob@example.com'],
  ])

  function taskWithComments() {
    return {
      ...editedTaskBase(),
      comments: [
        { id: 'c-old', author: 'user-2', text: 'Older note', createdAt: '2026-09-21T10:00:00.000Z' },
        { id: 'c-new', author: 'user-1', text: 'Newer note', createdAt: '2026-09-21T12:00:00.000Z' },
      ],
    }
  }

  function editedTaskBase(): Task {
    return {
      id: 'task-1',
      boardId: 'board-1',
      creator: 'user-1',
      owner: 'user-2',
      title: 'First task',
      description: 'Some description',
      state: 'ToDo',
      previousState: null,
      comments: [],
    }
  }

  let commentCounter = 0

  function stubTaskComments(taskObj: Task) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      const ok = (payload: unknown, status = 200) => ({ ok, status, json: async () => payload })
      const match = String(url).match(/\/boards\/[^/]+\/tasks\/([^/]+)\/comments(?:\/([^/]+))?$/)
      if (match !== null && match[1] === taskObj.id && method === 'POST') {
        commentCounter += 1
        const comment = {
          id: `c-fresh-${commentCounter}`,
          author: 'user-1',
          text: String(body.text),
          createdAt: '2026-09-21T14:00:00.000Z',
        }
        taskObj.comments.push(comment)
        return ok(comment, 201)
      }
      if (match !== null && match[1] === taskObj.id && match[2] !== undefined && method === 'PATCH') {
        const comment = taskObj.comments.find((c) => c.id === match[2])
        if (comment === undefined) {
          return { ok: false, status: 404, json: async () => ({}) }
        }
        comment.text = String(body.text)
        return ok(comment)
      }
      if (match !== null && match[1] === taskObj.id && match[2] !== undefined && method === 'DELETE') {
        taskObj.comments = taskObj.comments.filter((c) => c.id !== match[2])
        return ok({})
      }
      return ok({})
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  function toggle() {
    const button = container.querySelector('[aria-label="Toggle task comments"]')
    if (button === null) {
      throw new Error('comments toggle not found')
    }
    return button as HTMLButtonElement
  }

  async function expand() {
    act(() => {
      toggle().click()
    })
    await act(async () => {})
  }

  function commentItems(): string[] {
    return Array.from(container.querySelectorAll('ul li')).map((el) => el.textContent ?? '')
  }

  function typeComment(value: string) {
    const input = container.querySelector('input[aria-label="New task comment"]')
    if (input === null) {
      throw new Error('comment input not found')
    }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  async function commitWithEnter() {
    const input = container.querySelector('input[aria-label="New task comment"]')
    if (input === null) {
      throw new Error('comment input not found')
    }
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await act(async () => {})
  }

  it('shows the toggle with count and no list while collapsed', () => {
    stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS })

    expect(toggle().textContent).toContain('COMMENTS (2)')
    expect(container.textContent).not.toContain('Older note')
    expect(container.querySelector('input[aria-label="New task comment"]')).toBeNull()
  })

  it('expands newest-first and collapses again', async () => {
    stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS })

    await expand()
    const items = commentItems()
    expect(items).toHaveLength(2)
    expect(items[0]).toContain('Newer note')
    expect(items[1]).toContain('Older note')

    await expand()
    expect(container.textContent).not.toContain('Older note')
  })

  it('creates a comment with Enter and shows it first', async () => {
    const taskObj = taskWithComments()
    const fetchMock = stubTaskComments(taskObj)
    renderUi({ task: taskObj, members: MEMBERS })
    await expand()

    act(() => {
      typeComment('Fresh thought')
    })
    await commitWithEnter()

    const postCalls = fetchMock.mock.calls.filter(
      (call) =>
        String(call[0]).endsWith('/comments') &&
        (call[1] as RequestInit | undefined)?.method === 'POST',
    )
    expect(postCalls).toHaveLength(1)
    expect(JSON.parse(String((postCalls[0][1] as RequestInit).body))).toEqual({
      text: 'Fresh thought',
    })
    expect(toggle().textContent).toContain('COMMENTS (3)')
    expect(commentItems()[0]).toContain('Fresh thought')
    expect(
      (container.querySelector('input[aria-label="New task comment"]') as HTMLInputElement).value,
    ).toBe('')
  })

  it('rejects a blank comment inline without sending a request', async () => {
    const fetchMock = stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS })
    await expand()

    act(() => {
      typeComment('   ')
    })
    await commitWithEnter()

    expect(container.textContent).toContain('Comment is required.')
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).includes('/comments'))).toHaveLength(0)
  })

  it('lets the author edit their own comment', async () => {
    const taskObj = taskWithComments()
    const fetchMock = stubTaskComments(taskObj)
    renderUi({ task: taskObj, members: MEMBERS, actorId: 'user-2', isManager: false })
    await expand()

    act(() => {
      ;(container.querySelector('[aria-label="Edit Task comment c-old"]') as HTMLButtonElement).click()
    })
    await act(async () => {})
    const editInput = container.querySelector('input[aria-label="Task comment c-old"]')
    if (editInput === null) {
      throw new Error('comment edit input not found')
    }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setter?.call(editInput, 'Revised note')
      editInput.dispatchEvent(new Event('input', { bubbles: true }))
      editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await act(async () => {})

    const patchCalls = fetchMock.mock.calls.filter(
      (call) =>
        String(call[0]).endsWith('/comments/c-old') &&
        (call[1] as RequestInit | undefined)?.method === 'PATCH',
    )
    expect(patchCalls).toHaveLength(1)
    expect(container.textContent).toContain('Revised note')
  })

  it('lets a manager edit another member comment', async () => {
    const fetchMock = stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS })
    await expand()

    expect(container.querySelector('[aria-label="Edit Task comment c-old"]')).not.toBeNull()
    const editInput = (() => {
      act(() => {
        ;(container.querySelector('[aria-label="Edit Task comment c-old"]') as HTMLButtonElement).click()
      })
      return container.querySelector('input[aria-label="Task comment c-old"]')
    })()
    if (editInput === null) {
      throw new Error('comment edit input not found')
    }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setter?.call(editInput, 'Manager revision')
      editInput.dispatchEvent(new Event('input', { bubbles: true }))
      editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await act(async () => {})

    expect(
      fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/comments/c-old')),
    ).toHaveLength(1)
    expect(container.textContent).toContain('Manager revision')
  })

  it('lets the task owner edit another member comment', async () => {
    const fetchMock = stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS, actorId: 'user-2', isManager: false })
    await expand()

    expect(container.querySelector('[aria-label="Edit Task comment c-new"]')).not.toBeNull()

    const editInput = (() => {
      act(() => {
        ;(container.querySelector('[aria-label="Edit Task comment c-new"]') as HTMLButtonElement).click()
      })
      return container.querySelector('input[aria-label="Task comment c-new"]')
    })()
    if (editInput === null) {
      throw new Error('comment edit input not found')
    }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setter?.call(editInput, 'Owner revision')
      editInput.dispatchEvent(new Event('input', { bubbles: true }))
      editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await act(async () => {})

    expect(
      fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/comments/c-new')),
    ).toHaveLength(1)
    expect(container.textContent).toContain('Owner revision')
  })

  it('hides edit and remove actions from unrelated members', async () => {
    stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS, actorId: 'user-3', isManager: false })
    await expand()

    expect(container.querySelector('[aria-label="Edit Task comment c-old"]')).toBeNull()
    expect(container.querySelector('[aria-label="Remove task comment c-old"]')).toBeNull()
    expect(container.textContent).toContain('Older note')
  })

  it('removes a comment once confirmed with Yes', async () => {
    const fetchMock = stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS })
    await expand()

    act(() => {
      ;(container.querySelector('[aria-label="Remove task comment c-old"]') as HTMLButtonElement).click()
    })
    await act(async () => {})

    expect(container.querySelector('[aria-label="Remove task comment"]')).not.toBeNull()
    const yes = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'YES',
    ) as HTMLButtonElement | undefined
    act(() => {
      yes?.click()
    })
    await act(async () => {})

    expect(
      fetchMock.mock.calls.filter(
        (call) =>
          String(call[0]).endsWith('/comments/c-old') &&
          (call[1] as RequestInit | undefined)?.method === 'DELETE',
      ),
    ).toHaveLength(1)
    expect(container.textContent).not.toContain('Older note')
    expect(toggle().textContent).toContain('COMMENTS (1)')
  })

  it('keeps the comment when the removal is cancelled', async () => {
    const fetchMock = stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS })
    await expand()

    act(() => {
      ;(container.querySelector('[aria-label="Remove task comment c-old"]') as HTMLButtonElement).click()
    })
    await act(async () => {})

    const cancel = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'CANCEL',
    ) as HTMLButtonElement | undefined
    act(() => {
      cancel?.click()
    })
    await act(async () => {})

    expect(
      fetchMock.mock.calls.filter((call) => String(call[0]).includes('/comments')),
    ).toHaveLength(0)
    expect(container.textContent).toContain('Older note')
  })

  it('shows a disabled form without SAVE when not editable', async () => {
    stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS, editable: false })
    await expand()

    const title = container.querySelector('[aria-label="Task title"]') as HTMLInputElement | null
    expect(title).not.toBeNull()
    expect(title?.disabled).toBe(true)
    expect(
      Array.from(container.querySelectorAll('button')).some((b) => b.textContent === '> SAVE'),
    ).toBe(false)
    expect(container.querySelector('input[aria-label="New task comment"]')).not.toBeNull()
    expect(container.textContent).toContain('Older note')
  })

  it('hides the comments section in the new-task modal', () => {
    stubTaskComments(taskWithComments())
    renderUi({ members: MEMBERS })

    expect(container.querySelector('[aria-label="Toggle task comments"]')).toBeNull()
  })

  it('closes through the top-right X and offers no CLOSE button', async () => {
    const onClose = vi.fn()
    stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS, onClose })
    await expand()

    expect(
      Array.from(container.querySelectorAll('button')).some((b) => b.textContent === 'CLOSE'),
    ).toBe(false)
    const close = container.querySelector('[aria-label="Close task modal"]')
    expect(close).not.toBeNull()
    act(() => {
      ;(close as HTMLButtonElement).click()
    })
    await act(async () => {})

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('collapses the form independently of the comments toggle', async () => {
    stubTaskComments(taskWithComments())
    renderUi({ task: taskWithComments(), members: MEMBERS })

    const toggle = container.querySelector('[aria-label="Toggle task form"]')
    expect(toggle?.getAttribute('aria-expanded')).toBe('true')
    act(() => {
      ;(toggle as HTMLButtonElement).click()
    })
    await act(async () => {})

    expect(container.querySelector('[aria-label="Task title"]')).toBeNull()
    expect(container.querySelector('[aria-label="Toggle task comments"]')).not.toBeNull()

    act(() => {
      ;(container.querySelector('[aria-label="Toggle task form"]') as HTMLButtonElement).click()
    })
    await act(async () => {})

    expect(container.querySelector('[aria-label="Task title"]')).not.toBeNull()
  })

  it('shows busy on add and sends a single request on repeated Enter', async () => {
    let resolvePost!: (value: unknown) => void
    const postGate = new Promise<unknown>((resolve) => {
      resolvePost = resolve
    })
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/comments') && init?.method === 'POST') {
        return postGate
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)
    renderUi({ task: taskWithComments(), members: MEMBERS })
    await expand()

    act(() => {
      typeComment('Busy thought')
    })
    await commitWithEnter()

    expect(container.querySelector('[aria-label="Adding comment"]')).not.toBeNull()
    expect(
      (container.querySelector('input[aria-label="New task comment"]') as HTMLInputElement).disabled,
    ).toBe(true)

    await commitWithEnter()

    resolvePost({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'c-busy',
        author: 'user-1',
        text: 'Busy thought',
        createdAt: '2026-09-21T14:00:00.000Z',
      }),
    })
    await act(async () => {})

    expect(fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/comments'))).toHaveLength(1)
    expect(container.querySelector('[aria-label="Adding comment"]')).toBeNull()
    expect(container.textContent).toContain('Busy thought')
  })

  it('restores the entry when add fails', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
    renderUi({ task: taskWithComments(), members: MEMBERS })
    await expand()

    act(() => {
      typeComment('Lost thought')
    })
    await commitWithEnter()

    expect(container.textContent).toContain('Could not add the comment.')
    expect(
      (container.querySelector('input[aria-label="New task comment"]') as HTMLInputElement).value,
    ).toBe('Lost thought')
    expect(container.querySelector('[aria-label="Adding comment"]')).toBeNull()
  })

  it('shows busy on edit and restores on failure', async () => {
    let resolvePatch!: (value: unknown) => void
    const patchGate = new Promise<unknown>((resolve) => {
      resolvePatch = resolve
    })
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/comments/c-old') && init?.method === 'PATCH') {
        return patchGate
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)
    renderUi({ task: taskWithComments(), members: MEMBERS })
    await expand()

    act(() => {
      ;(container.querySelector('[aria-label="Edit Task comment c-old"]') as HTMLButtonElement).click()
    })
    await act(async () => {})
    const editInput = container.querySelector('input[aria-label="Task comment c-old"]')
    if (editInput === null) {
      throw new Error('comment edit input not found')
    }
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setter?.call(editInput, 'Slow revision')
      editInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await act(async () => {})

    const row = editInput.closest('li')
    expect(row?.querySelector('[aria-label="Working on comment"]')).not.toBeNull()
    expect(
      row?.querySelector('[aria-label="Remove task comment c-old"]')?.getAttribute('disabled'),
    ).not.toBeNull()

    resolvePatch({ ok: false, status: 500, json: async () => ({}) })
    await act(async () => {})

    expect(container.textContent).toContain('Could not save the comment.')
    expect(container.querySelector('[aria-label="Working on comment"]')).toBeNull()
    expect(container.textContent).toContain('Older note')
  })

  it('disables YES with busy on remove and restores on failure', async () => {
    let resolveDelete!: (value: unknown) => void
    const deleteGate = new Promise<unknown>((resolve) => {
      resolveDelete = resolve
    })
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/comments/c-old') && init?.method === 'DELETE') {
        return deleteGate
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)
    renderUi({ task: taskWithComments(), members: MEMBERS })
    await expand()

    act(() => {
      ;(container.querySelector('[aria-label="Remove task comment c-old"]') as HTMLButtonElement).click()
    })
    await act(async () => {})

    const yes = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'YES',
    ) as HTMLButtonElement | undefined
    act(() => {
      yes?.click()
    })
    await act(async () => {})

    expect(yes?.disabled).toBe(true)
    expect(container.querySelector('[aria-label="Removing comment"]')).not.toBeNull()

    resolveDelete({ ok: false, status: 500, json: async () => ({}) })
    await act(async () => {})

    expect(container.querySelector('[aria-label="Remove task comment"]')).not.toBeNull()
    expect(container.textContent).toContain('Older note')
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/comments/c-old'))).toHaveLength(1)
  })
})