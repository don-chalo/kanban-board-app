import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InlineEdit from './InlineEdit'

let container: HTMLDivElement
let root: Root

function renderEdit(props: {
  onSave: (value: string) => Promise<void>
  validate?: (value: string) => string | null
  value?: string
  editable?: boolean
}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <InlineEdit
        value={props.value ?? 'Original'}
        editable={props.editable ?? true}
        inputLabel="Board title"
        validate={props.validate}
        onSave={props.onSave}
      />,
    )
  })
}

async function flush() {
  await act(async () => {})
}

function editButton(): HTMLButtonElement {
  const el = container.querySelector('[aria-label="Edit Board title"]')
  if (el === null) {
    throw new Error('edit button not found')
  }
  return el as HTMLButtonElement
}

function input(): HTMLInputElement {
  const el = container.querySelector('[aria-label="Board title"]')
  if (el === null) {
    throw new Error('edit input not found')
  }
  return el as HTMLInputElement
}

async function openEditor() {
  act(() => {
    editButton().click()
  })
  await flush()
}

function typeValue(value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input(), value)
  input().dispatchEvent(new Event('input', { bubbles: true }))
}

function pressKey(key: string) {
  input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

beforeEach(() => {
  vi.useRealTimers()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('InlineEdit', () => {
  it('commits the trimmed value on Enter and returns to display', async () => {
    const onSave = vi.fn(async () => {
      return undefined
    })
    renderEdit({ onSave })
    await flush()

    await openEditor()
    expect(input().value).toBe('Original')
    act(() => {
      typeValue('  New Title  ')
    })
    act(() => {
      pressKey('Enter')
    })
    await flush()

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('New Title')
    expect(container.querySelector('[aria-label="Board title"]')).toBeNull()
  })

  it('cancels on Escape and does not lose the value on re-entry', async () => {
    const onSave = vi.fn(async () => {
      return undefined
    })
    renderEdit({ onSave })
    await flush()

    await openEditor()
    act(() => {
      typeValue('Changed')
    })
    act(() => {
      pressKey('Escape')
    })
    await flush()

    expect(onSave).not.toHaveBeenCalled()
    await openEditor()
    expect(input().value).toBe('Original')
  })

  it('cancels on blur without saving', async () => {
    const onSave = vi.fn(async () => {
      return undefined
    })
    renderEdit({ onSave })
    await flush()

    await openEditor()
    act(() => {
      typeValue('Changed')
    })
    act(() => {
      input().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    })
    await flush()

    expect(onSave).not.toHaveBeenCalled()
    expect(container.querySelector('[aria-label="Board title"]')).toBeNull()
  })

  it('ignores a repeat Enter while a save is in flight', async () => {
    let resolveSave: (() => void) | undefined
    const onSave = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        resolveSave = resolve
      })
    })
    renderEdit({ onSave })
    await flush()

    await openEditor()
    act(() => {
      typeValue('New')
    })
    act(() => {
      pressKey('Enter')
    })
    act(() => {
      pressKey('Enter')
    })
    await flush()

    expect(onSave).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveSave?.()
    })
  })

  it('shows the validation error inline and does not call onSave', async () => {
    const onSave = vi.fn(async () => {
      return undefined
    })
    const validate = (value: string) => (value.trim().length === 0 ? 'Title is required.' : null)
    renderEdit({ onSave, validate })
    await flush()

    await openEditor()
    act(() => {
      typeValue('   ')
    })
    act(() => {
      pressKey('Enter')
    })
    await flush()

    expect(onSave).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Title is required.')
  })

  it('surfaces a save failure inline and returns to the previous value', async () => {
    const onSave = vi.fn(async () => {
      throw new Error('boom')
    })
    renderEdit({ onSave })
    await flush()

    await openEditor()
    act(() => {
      typeValue('New')
    })
    act(() => {
      pressKey('Enter')
    })
    await flush()

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Could not save.')
    expect(container.querySelector('[aria-label="Board title"]')).toBeNull()
    expect(editButton().textContent).toBe('Original')
  })

  it('renders plain text when not editable and never exposes an edit control', async () => {
    const onSave = vi.fn(async () => {
      return undefined
    })
    renderEdit({ onSave, editable: false })
    await flush()

    expect(container.querySelector('[aria-label="Edit Board title"]')).toBeNull()
    expect(container.textContent).toContain('Original')
  })
})