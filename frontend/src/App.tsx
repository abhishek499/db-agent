import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Onboard from './pages/onboard/index'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Signup from './pages/Signup'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"          element={<Landing />} />
      <Route path="/login"     element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/signup"    element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/new"       element={<ProtectedRoute><Onboard /></ProtectedRoute>} />
      {/* Chat is accessible to all — access control handled by the backend */}
      <Route path="/chat/:agentId" element={<Chat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
