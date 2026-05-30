import { useState, useRef } from 'react'
import { uploadMedia } from '../utils/mediaUpload'

export default function VoiceRecorder({ onUploadComplete }) {
  const [state,    setState]    = useState('idle')  // idle | recording | uploading
  const [duration, setDuration] = useState(0)
  const [error,    setError]    = useState('')

  const mediaRecorder = useRef(null)
  const chunks        = useRef([])
  const timer         = useRef(null)

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      chunks.current = []

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      mediaRecorder.current.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: 'audio/webm'
        })
        setState('uploading')
        try {
          const media = await uploadMedia(file, () => {})
          onUploadComplete(media)
        } catch (err) {
          setError('Upload failed')
        } finally {
          setState('idle')
          setDuration(0)
        }
      }

      mediaRecorder.current.start()
      setState('recording')
      timer.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch {
      setError('Microphone permission denied')
    }
  }

  const stopRecording = () => {
    clearInterval(timer.current)
    mediaRecorder.current?.stop()
  }

  const cancelRecording = () => {
    clearInterval(timer.current)
    mediaRecorder.current?.stream?.getTracks().forEach((t) => t.stop())
    mediaRecorder.current?.stop()
    chunks.current = []
    setState('idle')
    setDuration(0)
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2 px-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-xs text-red-500 font-medium min-w-[36px]">
          {fmt(duration)}
        </span>
        <button onClick={stopRecording} title="Send voice note"
          className="text-indigo-600 hover:text-indigo-800 p-1">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </button>
        <button onClick={cancelRecording} title="Cancel"
          className="text-gray-400 hover:text-red-500 p-1 text-sm">✕</button>
      </div>
    )
  }

  if (state === 'uploading') {
    return (
      <div className="px-2">
        <span className="text-xs text-gray-400 animate-pulse">Sending…</span>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={startRecording}
        title="Record voice note"
        className="text-gray-400 hover:text-indigo-600 transition p-1.5 rounded-xl
          hover:bg-indigo-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
        </svg>
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}