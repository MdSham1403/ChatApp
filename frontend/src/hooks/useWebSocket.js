import { useEffect, useRef, useCallback } from 'react'

export function useWebSocket(onMessage) {
  const ws        = useRef(null)
  const reconnect = useRef(null)
  const onMsg     = useRef(onMessage)
  onMsg.current   = onMessage

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    ws.current = new WebSocket(`ws://localhost:8000/ws/chat?token=${token}`)

    ws.current.onopen = () => {
      console.log('WS connected')
      clearInterval(reconnect.current)
    }

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMsg.current(data)
      } catch {}
    }

    ws.current.onclose = () => {
      console.log('WS closed — reconnecting in 3s')
      reconnect.current = setTimeout(connect, 3000)
    }

    ws.current.onerror = () => ws.current.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnect.current)
      ws.current?.close()
    }
  }, [connect])

  const send = useCallback((type, payload) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  // Heartbeat — keeps presence alive
  useEffect(() => {
    const t = setInterval(() => send('ping', {}), 25000)
    return () => clearInterval(t)
  }, [send])

  return { send }
}