import { useEffect, useState } from 'react'
import { getAttachmentViewUrl } from '../lib/downloadFile'

interface FileThumbProps {
  fileName: string
  fileUrl: string
  isImage: boolean
  isVideo: boolean
}

/** CSS-scaled preview via a short-lived signed URL — no Image Transformation fees. */
export default function FileThumb({ fileName, fileUrl, isImage, isVideo }: FileThumbProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    setViewUrl(null)

    if (!isImage && !isVideo) return

    void getAttachmentViewUrl(fileUrl).then((url) => {
      if (!cancelled) setViewUrl(url)
    })

    return () => { cancelled = true }
  }, [fileUrl, isImage, isVideo])

  if (isImage) {
    if (failed || !viewUrl) {
      return (
        <span className="order-file-doc" title={fileName} aria-hidden="true">
          IMG
        </span>
      )
    }
    return (
      <a href={viewUrl} target="_blank" rel="noreferrer" className="order-file-preview-link" title={fileName}>
        <img
          src={viewUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </a>
    )
  }

  if (isVideo) {
    return (
      <a
        className="order-file-video-link"
        href={viewUrl || fileUrl}
        target="_blank"
        rel="noreferrer"
        title={fileName}
      >
        ▶
      </a>
    )
  }

  const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE'
  return (
    <span className="order-file-doc" title={fileName} aria-hidden="true">
      {ext.slice(0, 4)}
    </span>
  )
}
