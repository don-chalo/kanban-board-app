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
  comments: [],
}

function renderUi(
  moves: LifecycleState[],
  members = new Map([['user-2', 'bob@example.com']]),
  options: {
    onEdit?: (task: Task) => void
    movesFailed?: boolean
    task?: Task
  } = {},
) {
  const shown = options.task ?? task
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const onMoved = vi.fn()
  act(() => {
    root.render(
      <Tooltip.Provider delayDuration={0}>
        <ul>
          <TaskCard
            task={shown}
            members={members}
            moves={moves}
            movesFailed={options.movesFailed}
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
  it('shows the title (truncated) and the owner avatar letter without state or count', () => {
    renderUi(['InProgress'])

    const title = container.querySelector('p')
    expect(title?.textContent).toBe('WRITE TESTS')
    expect(title?.className).toContain('truncate')
    expect(container.textContent).not.toContain('TO DO')
    expect(container.textContent).not.toContain('COMMENTS')
    expect(container.textContent).toContain('B')
  })

  it('shows the comments count only when the task has comments', () => {
    renderUi(
      [],
      undefined,
      {
        task: {
          ...task,
          comments: [
            { id: 'c-1', author: 'user-2', text: 'Hi', createdAt: '2026-09-21T10:00:00.000Z' },
            { id: 'c-2', author: 'user-1', text: 'Hey', createdAt: '2026-09-21T11:00:00.000Z' },
          ],
        },
      },
    )

    expect(container.textContent).toContain('COMMENTS (2)')
  })

  it('keeps the count line rendered but empty without comments for stable height', () => {
    renderUi([])

    const line = container.querySelector('[data-testid="task-comments-count"]')
    expect(line).not.toBeNull()
    expect(line?.textContent).not.toContain('COMMENTS')
    expect(line?.getAttribute('aria-hidden')).toBe('true')
  })

  it('reveals story points through the Radix tooltip on hover', async () => {
    vi.useFakeTimers()
    try {
      renderUi([], undefined, { task: { ...task, storyPoints: 5 } })
      const badge = container.querySelector('[data-testid="task-story-points"]')
      if (badge === null) {
        throw new Error('story points badge not found')
      }
      expect(badge.textContent).toBe('5')
      act(() => {
        badge.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
      })
      await act(async () => {
        vi.advanceTimersByTime(50)
      })
      await flush()

      expect(document.body.textContent).toContain('Story points: 5')
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows the start date without a native hover title', () => {
    renderUi([], undefined, { task: { ...task, startedAt: '2026-09-16T10:00:00.000Z' } })

    const date = container.querySelector('[data-testid="task-started-at"]')
    expect(date?.textContent).toBe('2026-09-16')
    expect(date?.getAttribute('title')).toBeNull()
    expect(date?.getAttribute('aria-label')).toBe('Started 2026-09-16T10:00:00.000Z')
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

  it('renders the title as a button opening the modal when a handler is provided', () => {
    renderUi([], undefined, { onEdit: vi.fn() })

    expect(container.querySelector('[aria-label="Edit task Write tests"]')).not.toBeNull()
    expect(container.textContent).not.toContain('COMMENTS')
  })

  it('reports a click on the title with the task', () => {
    const onEdit = vi.fn()
    renderUi([], undefined, { onEdit })

    const button = container.querySelector('[aria-label="Edit task Write tests"]')
    if (button === null) {
      throw new Error('edit button not found')
    }
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onEdit).toHaveBeenCalledWith(task)
  })

  it('falls back to a plain title when no handler is provided', () => {
    renderUi([])

    expect(container.querySelector('[aria-label="Edit task Write tests"]')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('WRITE TESTS')
  })
})