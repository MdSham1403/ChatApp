import { useRef, useState } from 'react'
import { uploadMedia, ACCEPTED, formatSize } from '../utils/mediaUpload'

export default function MediaUpload({ onUploadComplete }) {
  const inputRef   = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState('')

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setUploading(true)
    setProgress(0)
    try {
      const media = await uploadMedia(file, setProgress)
      onUploadComplete(media)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const allAccepted = Object.values(ACCEPTED).join(',')

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={allAccepted}
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {/* Paperclip button */}
      {!uploading ? (
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          title="Attach file"
          className="text-gray-400 hover:text-indigo-600 transition p-1.5 rounded-xl
            hover:bg-indigo-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586
                 a4 4 0 00-5.656-5.656L5.757 10.757a6 6 0 108.486 8.486L19 14" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-2">
          <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{progress}%</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1 px-1">{error}</p>
      )}
    </div>
  )
}