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
  }

  it('renders with pre-filled values, an EDIT TASK heading, and a SAVE button', () => {
    renderUi({
      task: editedTask,
      members: new Map([
        ['user-1', 'alice@example.com'],
        ['user-2', 'bob@example.com'],
      ]),
    })

    expect(container.querySelector('h2')?.textContent).toBe('> EDIT TASK')
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