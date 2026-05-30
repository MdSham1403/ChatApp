import api from './api'

export const ACCEPTED = {
  image : 'image/jpeg,image/png,image/gif,image/webp',
  video : 'video/mp4,video/webm,video/quicktime',
  audio : 'audio/mpeg,audio/ogg,audio/wav,audio/webm',
  file  : '.pdf,.doc,.docx,.zip,.txt',
}

export function getMediaType(file) {
  const m = file.type
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  return 'file'
}

export function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function uploadMedia(file, onProgress) {
  const mediaType = getMediaType(file)

  // 1. Get signed upload URL from our backend
  const { data: sig } = await api.get(`/media/upload-url?media_type=${mediaType}`)

  // 2. Build FormData for Cloudinary
  const form = new FormData()
  form.append('file',       file)
  form.append('api_key',    sig.api_key)
  form.append('timestamp',  sig.timestamp)
  form.append('signature',  sig.signature)
  form.append('folder',     sig.folder)
  form.append('public_id',  sig.public_id)

  // 3. Upload directly to Cloudinary with progress tracking
  const xhr = new XMLHttpRequest()
  const result = await new Promise((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText))
      else reject(new Error('Cloudinary upload failed'))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.open('POST', sig.upload_url)
    xhr.send(form)
  })

  // 4. Confirm with our backend to save the DB record
  const { data: media } = await api.post('/media/confirm', {
    url        : result.secure_url,
    public_id  : result.public_id,
    media_type : mediaType,
    filename   : file.name,
    size_bytes : file.size,
    mime_type  : file.type,
    width      : result.width  || null,
    height     : result.height || null,
    duration   : result.duration ? Math.round(result.duration) : null,
  })

  return { ...media, local_type: mediaType }
}