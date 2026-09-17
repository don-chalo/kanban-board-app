import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import RequireAuth from './RequireAuth'

let container: HTMLDivElement
let root: Root

function renderUi() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/boards']}>
        <Routes>
          <Route path="/login" element={<div id="login-marker">login</div>} />
          <Route
            path="/boards"
            element={
              <RequireAuth>
                <div id="boards-marker">boards</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('RequireAuth', () => {
  it('renders the protected content when an identity is stored', () => {
    localStorage.setItem('todo.identity', JSON.stringify({ id: 'user-1', email: 'alice@example.com' }))
    renderUi()

    expect(container.querySelector('#boards-marker')).not.toBeNull()
    expect(container.querySelector('#login-marker')).toBeNull()
  })

  it('redirects to /login when no identity is stored', () => {
    renderUi()

    const loginMarker = container.querySelector('#login-marker')
    expect(container.querySelector('#boards-marker')).toBeNull()
    expect(loginMarker).not.toBeNull()
  })
})