import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Login          from './pages/Login'
import Register       from './pages/Register'
import ChatList       from './pages/ChatList'
import ChatRoom       from './pages/ChatRoom'
import Settings       from './pages/Settings'
import useAuthStore   from './store/authStore'
import usePrefsStore  from './store/prefsStore'
import api            from './utils/api'

function Protected({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('SW registered:', reg.scope)

    // Listen for flush_queue message from SW background sync
    navigator.serviceWorker.addEventListener('message', async (e) => {
      if (e.data?.type === 'flush_queue') {
        const { dequeue, removeFromQueue } = await import('./hooks/useOfflineQueue')
        const items = await dequeue()
        // Items will be flushed by the active WebSocket in ChatRoom
        // This just signals that connectivity is back
        console.log(`Flushing ${items.length} queued messages`)
      }
    })
  } catch (err) {
    console.error('SW registration failed:', err)
  }
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    const reg = await navigator.serviceWorker.ready
    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription()
    if (existing) return

    // Get VAPID public key from backend
    const { data } = await api.get('/push/vapid-key')
    const vapidKey  = data.public_key

    // Convert PEM → ArrayBuffer for applicationServerKey
    const keyBody   = vapidKey
      .replace(/-----[^-]+-----/g, '')
      .replace(/\s/g, '')
    const raw       = Uint8Array.from(atob(keyBody), (c) => c.charCodeAt(0))

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly     : true,
      applicationServerKey: raw,
    })

    // Send subscription to backend
    const subJson = sub.toJSON()
    await api.post('/push/subscribe', {
      endpoint : subJson.endpoint,
      keys     : subJson.keys,
    })
    console.log('Push subscribed')
  } catch (err) {
    console.log('Push subscription skipped:', err.message)
  }
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loadPrefs       = usePrefsStore((s) => s.load)

  useEffect(() => {
    registerServiceWorker()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadPrefs()
      // Request notification permission then subscribe
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') subscribeToPush()
        })
      } else if (Notification.permission === 'granted') {
        subscribeToPush()
      }
    }
  }, [isAuthenticated])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/chat"         element={<Protected><ChatList /></Protected>} />
        <Route path="/chat/:userId" element={<Protected><ChatRoom /></Protected>} />
        <Route path="/settings"     element={<Protected><Settings /></Protected>} />
        <Route path="*"             element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}