import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useChatStore from '../store/chatStore'
import { useWebSocket } from '../hooks/useWebSocket'
import MessageBubble from '../components/MessageBubble'
import TypingIndicator from '../components/TypingIndicator'
import api from '../utils/api'
import MediaUpload from '../components/MediaUpload'
import VoiceRecorder from '../components/VoiceRecorder'
import usePrefsStore from '../store/prefsStore'
import {
  encryptMessage,
  decryptMessage,
  hasPrivateKey,
  loadPrivateKey,
  isCiphertext
} from '../utils/crypto'

export default function ChatRoom() {
  const { userId }   = useParams()
  const { user: me } = useAuthStore()
  const store        = useChatStore()
  const prefs        = usePrefsStore()
  
  const messages     = store.conversations[userId] || []
  const isTyping     = store.typingUsers.has(userId)
  const isOnline     = store.onlineUsers.has(userId)

  const [otherUser,  setOtherUser]  = useState(null)
  const [input,      setInput]      = useState('')
  const [replyTo,    setReplyTo]    = useState(null)
  const bottomRef    = useRef(null)
  const typingTimer  = useRef(null)

  // ── Public Key Cache for E2E Asymmetric Decryption ──────────────────────
  const publicKeyCache = useRef({})   // user_id → public_key_b64
  
  const getPublicKey = async (targetId) => {
    if (publicKeyCache.current[targetId]) return publicKeyCache.current[targetId]
    try {
      const { data } = await api.get(`/auth/keys/public/${targetId}`)
      publicKeyCache.current[targetId] = data.public_key
      return data.public_key
    } catch {
      return null
    }
  }

  // ── Decryption Processing Helper ─────────────────────────────────────────
  const decryptBody = useCallback((msg) => {
    if (!msg.body || !isCiphertext(msg.body)) return msg
    if (!hasPrivateKey()) return { ...msg, body: '[key missing — cannot decrypt]' }
    
    const privateKey   = loadPrivateKey()
    const senderPubKey = publicKeyCache.current[msg.sender_id]
    if (!senderPubKey) return { ...msg, body: '[fetching key…]' }
    
    try {
      return {
        ...msg,
        body: decryptMessage(msg.body, privateKey, senderPubKey)
      }
    } catch {
      return { ...msg, body: '[decryption error]' }
    }
  }, [])

  // ── Build dynamic styles from user preferences (Step 9) ──────────────────
  const fontClass = prefs.font_size === 'sm' ? 'text-xs'
                  : prefs.font_size === 'lg' ? 'text-base'
                  : 'text-sm'

  const bgStyle = (() => {
    if (prefs.chat_bg_type === 'color')
      return { background: prefs.chat_bg_value }
    if (prefs.chat_bg_type === 'gradient')
      return { background: prefs.chat_bg_value }
    if (prefs.chat_bg_type === 'image')
      return {
        backgroundImage    : `url(${prefs.chat_bg_value})`,
        backgroundSize     : 'cover',
        backgroundPosition : 'center',
      }
    return {}
  })()

  // ── WS handler ───────────────────────────────────────────────────────────
  const handleWS = useCallback((evt) => {
    if (evt.type === 'message') {
      const decrypted = decryptBody(evt.payload)
      store.addMessage(decrypted)
    }
    if (evt.type === 'status')   store.updateStatus(evt.payload.message_id, evt.payload.status)
    if (evt.type === 'read')     {}
    if (evt.type === 'typing')   store.setTyping(evt.payload.from, evt.payload.is_typing)
    if (evt.type === 'reaction') store.updateReactions(evt.payload.message_id, evt.payload.reactions)
    if (evt.type === 'deleted')  store.deleteMessage(evt.payload.message_id)
  }, [store, decryptBody])

  const { send } = useWebSocket(handleWS)

  // ── Load data (Integrated with Pre-Fetched Keys) ─────────────────────────
  useEffect(() => {
    store.setActiveChat(userId)
    api.get(`/users/${userId}`).then((r) => setOtherUser(r.data))
    
    // Pre-fetch public keys for decryption workspace routines
    getPublicKey(userId).then(() => {
      // Fetch public key for yourself to decrypt inbound/outbound copies securely
      if (me?.id) getPublicKey(me.id)
      
      return api.get(`/messages/${userId}`)
    }).then((r) => {
      const decryptedList = r.data.map(msg => decryptBody(msg))
      store.loadMessages(userId, decryptedList)
    })

    return () => store.setActiveChat(null)
  }, [userId, me?.id, store, decryptBody])

  // ── Mark read ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length) {
      send('read', { sender_id: userId })
    }
  }, [messages.length, userId, send])

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  // ── Typing detection ─────────────────────────────────────────────────────
  const handleInput = (e) => {
    setInput(e.target.value)
    send('typing', { receiver_id: userId })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      send('stop_typing', { receiver_id: userId })
    }, 2000)
  }

  // ── Send message (Asymmetrical Crypto Cipher Payload Conversion) ─────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    let body = text

    // Encrypt if locally provisioned asymmetric keys exist
    if (hasPrivateKey()) {
      const receiverPublicKey = await getPublicKey(userId)
      if (receiverPublicKey) {
        body = encryptMessage(text, loadPrivateKey(), receiverPublicKey)
      }
    }

    send('send', {
      receiver_id  : userId,
      body,
      message_type : 'text',
      parent_id    : replyTo?.id || null,
    })
    setInput('')
    setReplyTo(null)
    send('stop_typing', { receiver_id: userId })
  }

  const handleMediaUpload = useCallback((media) => {
    send('send', {
      receiver_id  : userId,
      body         : null,
      message_type : media.local_type,
      media_url    : media.url,
      media_name   : media.filename,
      media_size   : String(media.size_bytes || ''),
      parent_id    : replyTo?.id || null,
    })
    setReplyTo(null)
  }, [userId, send, replyTo])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Reactions / delete ───────────────────────────────────────────────────
  const handleReact = (messageId, emoji) => {
    send('reaction', { message_id: messageId, emoji, other_user_id: userId })
  }

  const handleDelete = (messageId) => {
    send('delete', { message_id: messageId, other_user_id: userId })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link to="/chat" className="text-gray-400 hover:text-gray-600 mr-1">←</Link>
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center
            justify-center text-sm font-medium text-indigo-700">
            {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400
              rounded-full border-2 border-white" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {otherUser?.display_name || otherUser?.username || '…'}
          </p>
          <p className="text-xs text-gray-400">
            {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages Viewport Container — Custom Preferences Styled */}
      <div
        className={`flex-1 overflow-y-auto px-4 py-4 space-y-0.5 ${fontClass}`}
        style={bgStyle}
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMe={msg.sender_id === me?.id}
            sentColor={prefs.bubble_sent}
            receivedColor={prefs.bubble_received}
            onReact={handleReact}
            onReply={setReplyTo}
            onDelete={handleDelete}
          />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="bg-indigo-50 border-t border-indigo-100 px-4 py-2
          flex items-center justify-between">
          <div className="text-xs text-indigo-700">
            Replying: <span className="font-medium">
              {replyTo.body?.slice(0, 40) || 'encrypted body'}
            </span>
          </div>
          <button onClick={() => setReplyTo(null)}
            className="text-indigo-400 hover:text-indigo-600 text-sm">✕</button>
        </div>
      )}

      {/* Input composition workspace */}
      <div className="bg-white border-t border-gray-100 px-3 py-3">
        <div className="flex items-end gap-2">
          <MediaUpload onUploadComplete={handleMediaUpload} />
          <VoiceRecorder onUploadComplete={handleMediaUpload} />
          <textarea
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message…"
            className="flex-1 resize-none border border-gray-200 rounded-2xl
              px-4 py-2.5 text-sm focus:outline-none focus:ring-2
              focus:ring-indigo-500 max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40
              text-white rounded-2xl px-4 py-2.5 text-sm font-medium
              transition flex-shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}