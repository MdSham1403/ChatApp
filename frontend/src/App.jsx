import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ChatList from './pages/ChatList'
import ChatRoom from './pages/ChatRoom'
import ChatPlaceholder from './pages/ChatPlaceholder'
import Settings from './pages/Settings'
import useAuthStore from './store/authStore'
import usePrefsStore from './store/prefsStore'

// Auth Guard component to shield restricted views
function Protected({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loadPrefs       = usePrefsStore((s) => s.load)

  // ── Load Preferences on App Initialization (Step 14) ────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      loadPrefs()
    }
  }, [isAuthenticated, loadPrefs])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Screens */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* User Configuration Preferences Panel (Step 13) */}
        <Route path="/settings" element={
          <Protected>
            <Settings />
          </Protected>
        } />

        {/* Main Chat Framework. 
            When on '/chat', it shows the sidebar + placeholder text.
            When on '/chat/:userId', it keeps the sidebar but swaps the text for the actual active message room.
        */}
        <Route path="/chat" element={
          <Protected>
            <ChatList>
              <ChatPlaceholder />
            </ChatList>
          </Protected>
        } />
        
        <Route path="/chat/:userId" element={
          <Protected>
            <ChatList>
              <ChatRoom />
            </ChatList>
          </Protected>
        } />

        {/* Global Fallback Redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}