import { useState } from 'react'
import LinkPreview from './LinkPreview'

const EMOJIS = ['👍','❤️','😂','😮','😢','🔥']
const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/

function extractUrl(text) {
  const m = text?.match(URL_RE)
  return m ? m[0] : null
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MessageBubble({ msg, isMe, onReact, onReply, onDelete }) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [imgOpen, setImgOpen] = useState(false)

  if (msg.is_deleted) {
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
        <span className="text-xs text-gray-400 italic px-3 py-1.5 bg-gray-100 rounded-2xl">
          Message deleted
        </span>
      </div>
    )
  }

  const linkUrl = msg.message_type === 'text' ? extractUrl(msg.body) : null

  return (
    <>
      {/* Lightbox */}
      {imgOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setImgOpen(false)}
        >
          <img src={msg.media_url} alt="full"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}

      <div
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 group`}
        onMouseLeave={() => setShowEmoji(false)}
      >
        <div className="relative max-w-[72%]">

          {/* Reply preview */}
          {msg.parent_id && (
            <div className={`text-xs mb-1 px-3 py-1 rounded-xl border-l-2
              ${isMe
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 bg-gray-50 text-gray-500'
              }`}>
              ↩ Replying to a message
            </div>
          )}

          {/* Bubble */}
          <div className={`rounded-2xl text-sm leading-relaxed overflow-hidden
            ${isMe
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
            }`}
          >
            {/* ── Image ─────────────────────────────────────────────────── */}
            {msg.message_type === 'image' && msg.media_url && (
              <img
                src={msg.media_url}
                alt="shared image"
                className="max-w-full max-h-64 object-cover cursor-zoom-in"
                onClick={() => setImgOpen(true)}
              />
            )}

            {/* ── Video ─────────────────────────────────────────────────── */}
            {msg.message_type === 'video' && msg.media_url && (
              <video
                src={msg.media_url}
                controls
                className="max-w-full max-h-64 object-contain bg-black"
              />
            )}

            {/* ── Audio voice note ──────────────────────────────────────── */}
            {msg.message_type === 'audio' && msg.media_url && (
              <div className="px-3.5 py-2.5">
                <audio controls src={msg.media_url}
                  className="w-52 h-8 accent-white"
                  style={{ colorScheme: isMe ? 'dark' : 'light' }}
                />
              </div>
            )}

            {/* ── File ──────────────────────────────────────────────────── */}
            {msg.message_type === 'file' && msg.media_url && (
              <a
                href={msg.media_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-3.5 py-2.5 hover:opacity-80 transition"
              >
                <span className="text-2xl">📎</span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate
                    ${isMe ? 'text-white' : 'text-gray-800'}`}>
                    {msg.media_name || 'Download file'}
                  </p>
                  {msg.media_size && (
                    <p className={`text-xs ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {formatSize(Number(msg.media_size))}
                    </p>
                  )}
                </div>
                <span className={`ml-auto text-xs ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                  ↓
                </span>
              </a>
            )}

            {/* ── Text body ─────────────────────────────────────────────── */}
            {msg.body && (
              <div className="px-3.5 pt-2 pb-0.5">
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                {linkUrl && (
                  <LinkPreview url={linkUrl} isMe={isMe} />
                )}
              </div>
            )}

            {/* ── Timestamp + tick ──────────────────────────────────────── */}
            <div className={`flex items-center gap-1 justify-end px-3.5 pb-2 mt-0.5
              ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}
            >
              <span className="text-[10px]">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
              {isMe && (
                <span className="text-[11px]">
                  {msg.status === 'read'
                    ? <span className="text-sky-300">✓✓</span>
                    : msg.status === 'delivered'
                    ? '✓✓'
                    : '✓'
                  }
                </span>
              )}
            </div>
          </div>

          {/* Reactions */}
          {msg.reactions?.length > 0 && (
            <div className={`flex flex-wrap gap-0.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(
                msg.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1
                  return acc
                }, {})
              ).map(([emoji, count]) => (
                <button key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  className="text-xs bg-white border border-gray-100 rounded-full px-1.5 py-0.5 hover:bg-gray-50 shadow-sm"
                >
                  {emoji}{count > 1 ? ` ${count}` : ''}
                </button>
              ))}
            </div>
          )}

          {/* Hover action buttons */}
          <div className={`absolute top-0
            ${isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'}
            hidden group-hover:flex items-center gap-1`}>
            <button onClick={() => setShowEmoji((v) => !v)}
              className="text-gray-400 hover:text-gray-600 text-sm p-1 rounded-lg hover:bg-gray-100">
              😊
            </button>
            <button onClick={() => onReply(msg)}
              className="text-gray-400 hover:text-gray-600 text-sm p-1 rounded-lg hover:bg-gray-100">
              ↩
            </button>
            {isMe && (
              <button onClick={() => onDelete(msg.id)}
                className="text-gray-400 hover:text-red-500 text-sm p-1 rounded-lg hover:bg-red-50">
                🗑
              </button>
            )}
          </div>

          {/* Emoji picker */}
          {showEmoji && (
            <div className={`absolute z-20 top-8 ${isMe ? 'right-0' : 'left-0'}
              bg-white border border-gray-100 rounded-2xl shadow-xl flex gap-0.5 px-2 py-1.5`}>
              {EMOJIS.map((e) => (
                <button key={e}
                  onClick={() => { onReact(msg.id, e); setShowEmoji(false) }}
                  className="text-xl hover:scale-125 transition-transform p-0.5">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}