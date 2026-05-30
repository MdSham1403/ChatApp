import { useEffect, useState } from 'react'
import api from '../utils/api'

export default function LinkPreview({ url, isMe }) {
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!url) return
    api.get(`/media/preview?url=${encodeURIComponent(url)}`)
      .then((r) => setPreview(r.data))
      .catch(() => {})
  }, [url])

  if (!preview) return null

  return (
    <a
      href={preview.url || url}
      target="_blank"
      rel="noreferrer"
      className={`block mt-2 rounded-xl overflow-hidden border text-left
        hover:opacity-90 transition max-w-sm
        ${isMe
          ? 'border-indigo-500 bg-indigo-800'
          : 'border-gray-700 bg-gray-800'
        }`}
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title}
          className="w-full h-32 object-cover"
          onError={(e) => (e.target.style.display = 'none')}
        />
      )}
      <div className="px-3 py-2">
        {preview.site_name && (
          <p className={`text-[10px] uppercase tracking-wide mb-0.5
            ${isMe ? 'text-indigo-300' : 'text-gray-400'}`}>
            {preview.site_name}
          </p>
        )}
        <p className={`text-xs font-medium leading-snug
          ${isMe ? 'text-white' : 'text-gray-200'}`}>
          {preview.title || 'Link Preview'}
        </p>
        {preview.description && (
          <p className={`text-[11px] mt-0.5 line-clamp-2
            ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
            {preview.description}
          </p>
        )}
      </div>
    </a>
  )
}