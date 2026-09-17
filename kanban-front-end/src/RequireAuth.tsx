import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { readIdentity } from './lib/session'

function RequireAuth({ children }: { children: ReactNode }) {
  if (readIdentity() === null) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default RequireAuth