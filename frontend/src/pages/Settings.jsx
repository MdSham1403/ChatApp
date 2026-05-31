import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import usePrefsStore from '../store/prefsStore'
import useAuthStore from '../store/authStore'
import api from '../utils/api'
import { savePrivateKey, hasPrivateKey, clearPrivateKey } from '../utils/crypto'

const GRADIENTS = [
  { name: 'Dusk',    value: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { name: 'Peach',   value: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { name: 'Ocean',   value: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { name: 'Forest',  value: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
  { name: 'Sunset',  value: 'linear-gradient(135deg,#fa709a,#fee140)' },
  { name: 'Slate',   value: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)' },
]

const FONT_SIZES = [
  { label: 'Small',  value: 'sm', preview: 'text-xs' },
  { label: 'Medium', value: 'md', preview: 'text-sm' },
  { label: 'Large',  value: 'lg', preview: 'text-base' },
]

export default function Settings() {
  const prefs      = usePrefsStore()
  const { user }   = useAuthStore()
  const [tab, setTab]       = useState('appearance')
  const [keyStatus, setKeyStatus] = useState(hasPrivateKey() ? 'saved' : 'none')
  const [keyLoading, setKeyLoading] = useState(false)
  const [keyMsg, setKeyMsg] = useState('')
  const [totp, setTotp]     = useState({ qr: '', secret: '', code: '', step: 'idle' })

  useEffect(() => { prefs.load() }, [])

  // ── 2FA handlers ──────────────────────────────────────────────────────────
  const setup2FA = async () => {
    const { data } = await api.post('/auth/2fa/setup')
    setTotp({ qr: data.qr_code, secret: data.secret, code: '', step: 'scan' })
  }

  const confirm2FA = async () => {
    try {
      await api.post('/auth/2fa/confirm', {
        secret: totp.secret, code: totp.code
      })
      setTotp({ qr: '', secret: '', code: '', step: 'done' })
    } catch {
      setTotp((t) => ({ ...t, code: '', step: 'error' }))
    }
  }

  const disable2FA = async () => {
    const code = prompt('Enter your authenticator code to disable 2FA:')
    if (!code) return
    try {
      await api.post('/auth/2fa/disable', { code })
      alert('2FA disabled.')
    } catch {
      alert('Invalid code.')
    }
  }

  // ── E2E key handlers ──────────────────────────────────────────────────────
  const generateKeys = async () => {
    if (keyStatus === 'saved') {
      const ok = confirm(
        'You already have keys saved. Generating new keys means old ' +
        'encrypted messages can no longer be decrypted. Continue?'
      )
      if (!ok) return
    }
    setKeyLoading(true)
    setKeyMsg('')
    try {
      const { data } = await api.post('/auth/keys/generate')
      savePrivateKey(data.private_key)
      setKeyStatus('saved')
      setKeyMsg('Keys generated and saved to this device.')
    } catch (err) {
      setKeyMsg(err.response?.data?.detail || 'Failed to generate keys.')
    } finally {
      setKeyLoading(false)
    }
  }

  const exportKey = () => {
    const key = localStorage.getItem('chatapp_private_key')
    if (!key) return
    const blob = new Blob([key], { type: 'text/plain' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = 'chatapp_private_key.txt'
    a.click()
  }

  const importKey = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      savePrivateKey(ev.target.result.trim())
      setKeyStatus('saved')
      setKeyMsg('Private key imported successfully.')
    }
    reader.readAsText(file)
  }

  // ── Background helpers ────────────────────────────────────────────────────
  const bgPreview = () => {
    if (prefs.chat_bg_type === 'color')    return { background: prefs.chat_bg_value }
    if (prefs.chat_bg_type === 'gradient') return { background: prefs.chat_bg_value }
    if (prefs.chat_bg_type === 'image')
      return { backgroundImage: `url(${prefs.chat_bg_value})`,
               backgroundSize: 'cover', backgroundPosition: 'center' }
    return { background: '#f8fafc' }
  }

  const TABS = ['appearance', 'security', 'notifications']

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100
        dark:border-gray-700 px-4 py-4 flex items-center gap-3">
        <Link to="/chat"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Settings
        </h1>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100
        dark:border-gray-700 px-4 flex gap-1">
        {TABS.map((t) => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium capitalize border-b-2
              transition ${tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* ── Appearance tab ─────────────────────────────────────────────── */}
        {tab === 'appearance' && (
          <>
            {/* Dark mode */}
            <Section title="Theme">
              <Toggle
                label="Dark mode"
                value={prefs.dark_mode}
                onChange={(v) => prefs.update({ dark_mode: v })}
              />
            </Section>

            {/* Font size */}
            <Section title="Font size">
              <div className="grid grid-cols-3 gap-2">
                {FONT_SIZES.map((f) => (
                  <button key={f.value}
                    onClick={() => prefs.update({ font_size: f.value })}
                    className={`rounded-xl border py-3 text-center transition
                      ${prefs.font_size === f.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-700'
                      }`}>
                    <span className={`${f.preview} font-medium
                      text-gray-800 dark:text-gray-200`}>
                      {f.label}
                    </span>
                    <p className={`${f.preview} text-gray-400 mt-0.5`}>Aa</p>
                  </button>
                ))}
              </div>
            </Section>

            {/* Chat background */}
            <Section title="Chat background">
              {/* Preview */}
              <div className="w-full h-28 rounded-xl mb-4 border border-gray-200
                dark:border-gray-700 flex items-end p-3 gap-2"
                style={bgPreview()}>
                <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-1.5
                  text-xs text-gray-700 shadow-sm border border-gray-100">
                  Hello 👋
                </div>
                <div className="ml-auto rounded-2xl rounded-br-sm px-3 py-1.5
                  text-xs text-white shadow-sm"
                  style={{ background: prefs.bubble_sent }}>
                  Hey! 😊
                </div>
              </div>

              {/* BG type selector */}
              <div className="flex gap-2 mb-4">
                {['default','color','gradient','image'].map((t) => (
                  <button key={t}
                    onClick={() => prefs.update({ chat_bg_type: t })}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium
                      border capitalize transition
                      ${prefs.chat_bg_type === t
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Solid colour picker */}
              {prefs.chat_bg_type === 'color' && (
                <div className="flex items-center gap-3">
                  <input type="color"
                    value={prefs.chat_bg_value || '#f1f5f9'}
                    onChange={(e) => prefs.update({ chat_bg_value: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">
                    {prefs.chat_bg_value || '#f1f5f9'}
                  </span>
                </div>
              )}

              {/* Gradient picker */}
              {prefs.chat_bg_type === 'gradient' && (
                <div className="grid grid-cols-3 gap-2">
                  {GRADIENTS.map((g) => (
                    <button key={g.name}
                      onClick={() => prefs.update({ chat_bg_value: g.value })}
                      className={`h-16 rounded-xl border-2 transition
                        ${prefs.chat_bg_value === g.value
                          ? 'border-indigo-600 scale-95'
                          : 'border-transparent'
                        }`}
                      style={{ background: g.value }}
                      title={g.name}
                    />
                  ))}
                </div>
              )}

              {/* Image URL input */}
              {prefs.chat_bg_type === 'image' && (
                <div>
                  <input
                    type="url"
                    placeholder="Paste an image URL…"
                    value={prefs.chat_bg_value || ''}
                    onChange={(e) => prefs.update({ chat_bg_value: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                      text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                      dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Use any direct image URL (jpg, png, gif)
                  </p>
                </div>
              )}
            </Section>

            {/* Bubble colours */}
            <Section title="Message bubble colours">
              <div className="space-y-3">
                <ColorRow
                  label="Your messages"
                  value={prefs.bubble_sent}
                  onChange={(v) => prefs.update({ bubble_sent: v })}
                />
                <ColorRow
                  label="Their messages (border)"
                  value={prefs.bubble_received}
                  onChange={(v) => prefs.update({ bubble_received: v })}
                />
              </div>
            </Section>
          </>
        )}

        {/* ── Security tab ───────────────────────────────────────────────── */}
        {tab === 'security' && (
          <>
            {/* 2FA */}
            <Section title="Two-factor authentication">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Adds a second layer of protection using an authenticator app
                like Google Authenticator or Authy.
              </p>

              {totp.step === 'idle' && (
                <div className="flex gap-3">
                  <button onClick={setup2FA}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white
                      text-sm font-medium rounded-xl py-2.5 transition">
                    Enable 2FA
                  </button>
                  <button onClick={disable2FA}
                    className="flex-1 border border-red-200 text-red-500
                      hover:bg-red-50 text-sm font-medium rounded-xl py-2.5 transition">
                    Disable 2FA
                  </button>
                </div>
              )}

              {totp.step === 'scan' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Scan this QR code with your authenticator app:
                  </p>
                  <div className="flex justify-center">
                    <img
                      src={`data:image/png;base64,${totp.qr}`}
                      alt="2FA QR code"
                      className="w-48 h-48 border border-gray-200 rounded-xl p-2 bg-white"
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    Or enter secret manually:{' '}
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5
                      rounded text-gray-700 dark:text-gray-200 select-all">
                      {totp.secret}
                    </code>
                  </p>
                  <input
                    value={totp.code}
                    onChange={(e) => setTotp((t) => ({ ...t, code: e.target.value }))}
                    placeholder="Enter 6-digit code to confirm"
                    maxLength={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                      text-sm text-center tracking-widest text-lg
                      focus:outline-none focus:ring-2 focus:ring-indigo-500
                      dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                  <button onClick={confirm2FA}
                    disabled={totp.code.length !== 6}
                    className="w-full bg-indigo-600 hover:bg-indigo-700
                      disabled:opacity-40 text-white text-sm font-medium
                      rounded-xl py-2.5 transition">
                    Confirm & enable 2FA
                  </button>
                </div>
              )}

              {totp.step === 'done' && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700
                  dark:text-green-400 rounded-xl px-4 py-3 text-sm">
                  ✓ 2FA is now enabled on your account.
                </div>
              )}

              {totp.step === 'error' && (
                <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                  Invalid code. Please try scanning again.
                  <button onClick={() => setTotp({ ...totp, step: 'scan', code: '' })}
                    className="ml-2 underline">
                    Retry
                  </button>
                </div>
              )}
            </Section>

            {/* E2E Keys */}
            <Section title="End-to-end encryption keys">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Your private key lives only on this device. The server never
                sees it. Without it, encrypted messages can't be read.
              </p>

              <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium
                ${keyStatus === 'saved'
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                }`}>
                {keyStatus === 'saved'
                  ? '🔐 Private key saved on this device'
                  : '⚠️ No private key found — generate or import one'
                }
              </div>

              {keyMsg && (
                <p className="text-sm text-gray-500 mb-3">{keyMsg}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={generateKeys} disabled={keyLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                    text-white text-sm font-medium rounded-xl py-2.5 transition">
                  {keyLoading ? 'Generating…' : 'Generate keys'}
                </button>
                {keyStatus === 'saved' && (
                  <button onClick={exportKey}
                    className="border border-gray-200 text-gray-600 hover:bg-gray-50
                      text-sm font-medium rounded-xl py-2.5 transition
                      dark:border-gray-700 dark:text-gray-300">
                    Export private key
                  </button>
                )}
              </div>

              <div className="mt-3">
                <label className="text-sm text-gray-500 block mb-1">
                  Import private key from backup
                </label>
                <input type="file" accept=".txt"
                  onChange={importKey}
                  className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3
                    file:rounded-lg file:border file:border-gray-200
                    file:text-xs file:text-gray-600 file:bg-white
                    hover:file:bg-gray-50 cursor-pointer"
                />
              </div>
            </Section>
          </>
        )}

        {/* ── Notifications tab ──────────────────────────────────────────── */}
        {tab === 'notifications' && (
          <Section title="Notifications">
            <Toggle
              label="Sound on new message"
              value={prefs.notif_sound}
              onChange={(v) => prefs.update({ notif_sound: v })}
            />
          </Section>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border
      border-gray-100 dark:border-gray-700 p-5">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors
          ${value ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white
          rounded-full shadow transition-transform
          ${value ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border border-gray-200"
          style={{ background: value }} />
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <input type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
      />
    </div>
  )
}