import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import * as Tooltip from '@radix-ui/react-tooltip'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LifecycleState, Task } from '../lib/api'
import TaskCard from './TaskCard'

let container: HTMLDivElement
let root: Root

const task: Task = {
  id: 'task-1',
  boardId: 'board-1',
  creator: 'user-1',
  owner: 'user-2',
  title: 'Write tests',
  description: '',
  state: 'ToDo',
  previousState: null,
}

function renderUi(
  moves: LifecycleState[],
  members = new Map([['user-2', 'bob@example.com']]),
  options: {
    editable?: boolean
    onEdit?: (task: Task) => void
    movesFailed?: boolean
  } = {},
) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const onMoved = vi.fn()
  act(() => {
    root.render(
      <Tooltip.Provider delayDuration={0}>
        <ul>
          <TaskCard
            task={task}
            members={members}
            moves={moves}
            movesFailed={options.movesFailed}
            editable={options.editable}
            onEdit={options.onEdit}
            onMoved={onMoved}
          />
        </ul>
      </Tooltip.Provider>,
    )
  })
  return onMoved
}

async function flush() {
  await act(async () => {})
}

function arrowButton() {
  const button = container.querySelector('[aria-label="Move task Write tests"]')
  if (button === null) {
    throw new Error('task arrow not found')
  }
  return button
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('TaskCard', () => {
  it('shows the title (truncated), the state, and the owner avatar letter', () => {
    renderUi(['InProgress'])

    const title = container.querySelector('p')
    expect(title?.textContent).toBe('WRITE TESTS')
    expect(title?.className).toContain('truncate')
    expect(container.textContent).toContain('TO DO')
    expect(container.textContent).toContain('B')
  })

  it('shows the full email in a tooltip when the avatar is hovered', async () => {
    vi.useFakeTimers()
    try {
      renderUi([])
      const avatar = container.querySelector('[data-testid="task-owner-avatar"]')
      if (avatar === null) {
        throw new Error('avatar not found')
      }
      act(() => {
        avatar.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
      })
      await act(async () => {
        vi.advanceTimersByTime(50)
      })
      await flush()

      const tooltip = document.body.textContent
      expect(tooltip).toContain('bob@example.com')
    } finally {
      vi.useRealTimers()
    }
  })

  it('hides the arrow when no moves are legal', () => {
    renderUi([])

    expect(container.querySelector('[aria-label="Move task Write tests"]')).toBeNull()
  })

  it('keeps a disabled arrow when the moves lookup failed', () => {
    renderUi([], undefined, { movesFailed: true })

    const button = container.querySelector('[aria-label="Move task Write tests"]')
    expect(button?.getAttribute('disabled')).not.toBeNull()
  })

  it('opens a dropdown of legal moves and reports the choice', async () => {
    const onMoved = renderUi(['InProgress', 'Blocked', 'Cancelled'])

    act(() => {
      arrowButton().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    const bodyText = document.body.textContent ?? ''
    expect(bodyText).toContain('IN PROGRESS')
    expect(bodyText).toContain('BLOCKED')

    const item = Array.from(document.body.querySelectorAll('[role="option"]')).find((el) =>
      el.textContent?.includes('IN PROGRESS'),
    )
    if (item === undefined) {
      throw new Error('move option not found')
    }
    act(() => {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    expect(onMoved).toHaveBeenCalledWith('task-1', 'InProgress')
  })

  it('renders the title as an editable button when editable with a handler', () => {
    renderUi([], undefined, { editable: true, onEdit: vi.fn() })

    expect(container.querySelector('[aria-label="Edit task Write tests"]')).not.toBeNull()
    expect((container.querySelector('p') as HTMLElement)?.textContent).not.toContain('WRITE TESTS')
  })

  it('reports a click on the editable title with the task', () => {
    const onEdit = vi.fn()
    renderUi([], undefined, { editable: true, onEdit })

    const button = container.querySelector('[aria-label="Edit task Write tests"]')
    if (button === null) {
      throw new Error('edit button not found')
    }
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onEdit).toHaveBeenCalledWith(task)
  })

  it('falls back to a plain title when editable but no handler is provided', () => {
    renderUi([], undefined, { editable: true })

    expect(container.querySelector('[aria-label="Edit task Write tests"]')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('WRITE TESTS')
  })
})