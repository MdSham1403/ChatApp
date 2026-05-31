import { create } from 'zustand'
import api from '../utils/api'

const DEFAULTS = {
  chat_bg_type    : 'default',
  chat_bg_value   : null,
  bubble_sent     : '#4f46e5',
  bubble_received : '#ffffff',
  font_size       : 'md',
  dark_mode       : false,
  notif_sound     : true,
}

const usePrefsStore = create((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  load: async () => {
    try {
      const { data } = await api.get('/users/me/preferences')
      set({ ...data, loaded: true })
      applyDarkMode(data.dark_mode)
    } catch {
      set({ loaded: true })
    }
  },

  update: async (patch) => {
    set(patch)
    if (patch.dark_mode !== undefined) applyDarkMode(patch.dark_mode)
    try {
      await api.put('/users/me/preferences', patch)
    } catch (err) {
      console.error('Failed to save preferences', err)
    }
  },
}))

function applyDarkMode(enabled) {
  document.documentElement.classList.toggle('dark', enabled)
}

export default usePrefsStore