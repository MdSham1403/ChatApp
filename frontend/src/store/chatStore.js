import { create } from 'zustand'

const useChatStore = create((set, get) => ({
  conversations : {},   // user_id → Message[]
  activeChat    : null, // user_id of open conversation
  onlineUsers   : new Set(),
  typingUsers   : new Set(),

  setActiveChat: (userId) => set({ activeChat: userId }),

  setOnline: (userId, flag) => set((s) => {
    const next = new Set(s.onlineUsers)
    flag ? next.add(userId) : next.delete(userId)
    return { onlineUsers: next }
  }),

  setTyping: (userId, flag) => set((s) => {
    const next = new Set(s.typingUsers)
    flag ? next.add(userId) : next.delete(userId)
    return { typingUsers: next }
  }),

  loadMessages: (userId, messages) => set((s) => ({
    conversations: { ...s.conversations, [userId]: messages },
  })),

  addMessage: (msg) => set((s) => {
    const key  = msg.sender_id === s.activeChat ? msg.sender_id : msg.receiver_id
    const prev = s.conversations[key] || []
    // Avoid duplicate if echo comes back
    if (prev.find((m) => m.id === msg.id)) return {}
    return { conversations: { ...s.conversations, [key]: [...prev, msg] } }
  }),

  updateStatus: (messageId, status) => set((s) => {
    const updated = {}
    for (const [uid, msgs] of Object.entries(s.conversations)) {
      updated[uid] = msgs.map((m) =>
        m.id === messageId ? { ...m, status } : m
      )
    }
    return { conversations: updated }
  }),

  updateReactions: (messageId, reactions) => set((s) => {
    const updated = {}
    for (const [uid, msgs] of Object.entries(s.conversations)) {
      updated[uid] = msgs.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      )
    }
    return { conversations: updated }
  }),

  deleteMessage: (messageId) => set((s) => {
    const updated = {}
    for (const [uid, msgs] of Object.entries(s.conversations)) {
      updated[uid] = msgs.map((m) =>
        m.id === messageId
          ? { ...m, is_deleted: true, body: null }
          : m
      )
    }
    return { conversations: updated }
  }),
}))

export default useChatStore