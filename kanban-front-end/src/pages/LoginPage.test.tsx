import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

let container: HTMLDivElement
let root: Root

function renderUi() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/boards" element={<div id="boards-marker">boards</div>} />
        </Routes>
      </MemoryRouter>,
    )
  })
}

function setEmail(value: string) {
  const input = container.querySelector('input')
  if (input === null) {
    throw new Error('email input not found')
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
}

async function mockResponse(ok: boolean, status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.unstubAllGlobals()
})

describe('LoginPage', () => {
  it('redirects to the boards page after a successful login', async () => {
    await mockResponse(true, 200, { id: 'user-1', email: 'alice@example.com' })
    renderUi()

    setEmail('  alice@example.com  ')
    await submit()

    expect(container.querySelector('#boards-marker')).not.toBeNull()
    expect(localStorage.getItem('todo.identity')).toContain('user-1')
  })

  it('shows an inline error and sends no request for an invalid email', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: false, status: 500, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
    renderUi()

    setEmail('not-an-email')
    await submit()

    expect(container.textContent).toContain('Enter a valid email')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(container.querySelector('#boards-marker')).toBeNull()
  })

  it('keeps the user on the page and shows an error when the API call fails', async () => {
    await mockResponse(false, 500)
    renderUi()

    setEmail('alice@example.com')
    await submit()

    expect(container.textContent).toContain('Login failed')
    expect(container.querySelector('#boards-marker')).toBeNull()
    expect(container.querySelector('form')).not.toBeNull()
  })
})