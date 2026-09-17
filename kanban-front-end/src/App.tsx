import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './RequireAuth'
import BoardsPage from './pages/BoardsPage'
import LoginPage from './pages/LoginPage'
import BoardDetailPage from './pages/BoardDetailPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/boards"
          element={
            <RequireAuth>
              <BoardsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/boards/:boardId"
          element={
            <RequireAuth>
              <BoardDetailPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App