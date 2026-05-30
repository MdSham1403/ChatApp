import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useChatStore from '../store/chatStore'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../utils/api'

export default function ChatList() {
  const navigate        = useNavigate()
  const { user, logout } = useAuthStore()
  const store           = useChatStore()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])

  const handleWS = useCallback((evt) => {
    if (evt.type === 'message')  store.addMessage(evt.payload)
    if (evt.type === 'typing')   store.setTyping(evt.payload.from, evt.payload.is_typing)
    if (evt.type === 'reaction') store.updateReactions(evt.payload.message_id, evt.payload.reactions)
    if (evt.type === 'deleted')  store.deleteMessage(evt.payload.message_id)
  }, [store])

  useWebSocket(handleWS)

  const handleSearch = async (e) => {
    const q = e.target.value
    setSearch(q)
    if (q.length < 2) { setResults([]); return }
    const { data } = await api.get(`/users/search?q=${q}`)
    setResults(data)
  }

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto
      border-x border-gray-100">

      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          <button onClick={logout}
            className="text-sm text-gray-400 hover:text-red-500">
            Sign out
          </button>
        </div>
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search users…"
          className="w-full bg-gray-100 rounded-2xl px-4 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
            People
          </p>
          {results.map((u) => (
            <button key={u.id}
              onClick={() => { navigate(`/chat/${u.id}`); setResults([]); setSearch('') }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                hover:bg-gray-50 transition text-left">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center
                justify-center text-sm font-medium text-indigo-700 flex-shrink-0">
                {u.display_name?.[0]?.toUpperCase() || u.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{u.display_name}</p>
                <p className="text-xs text-gray-400">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && search.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm font-medium">Search for someone to message</p>
            <p className="text-xs mt-1">Type a name or username above</p>
          </div>
        </div>
      )}
    </div>
  )
}