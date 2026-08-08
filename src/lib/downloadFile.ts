import { supabase } from './supabase'

const BUCKET = 'chkchk-attachments'
const PUBLIC_MARKER = `/object/public/${BUCKET}/`
const SIGN_MARKER = `/object/sign/${BUCKET}/`
const AUTH_MARKER = `/object/authenticated/${BUCKET}/`

export function storagePathFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    for (const marker of [PUBLIC_MARKER, SIGN_MARKER, AUTH_MARKER]) {
      const idx = url.pathname.indexOf(marker)
      if (idx === -1) continue
      const rest = url.pathname.slice(idx + marker.length)
      return decodeURIComponent(rest)
    }
    return null
  } catch {
    return null
  }
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

/** Temporary view/preview URL for private storage (free — not Image Transformations). */
export async function getAttachmentViewUrl(fileUrl: string, expiresInSeconds = 60 * 60): Promise<string> {
  const path = storagePathFromUrl(fileUrl)
  if (!path) return fileUrl

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data?.signedUrl) return fileUrl
  return data.signedUrl
}

/** Save a work file to the user's device. */
export async function downloadWorkFile(fileUrl: string, fileName: string): Promise<void> {
  const path = storagePathFromUrl(fileUrl)

  if (path) {
    const { data, error } = await supabase.storage.from(BUCKET).download(path)
    if (!error && data) {
      triggerBlobDownload(data, fileName)
      return
    }
  }

  const viewUrl = await getAttachmentViewUrl(fileUrl)
  const response = await fetch(viewUrl)
  if (!response.ok) {
    throw new Error('Could not download that file.')
  }
  const blob = await response.blob()
  triggerBlobDownload(blob, fileName)
}
