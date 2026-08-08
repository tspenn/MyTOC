import { useMemo, useRef, useState } from 'react'
import FileThumb from './FileThumb'
import { downloadWorkFile, getAttachmentViewUrl } from '../lib/downloadFile'
import type { ChecklistAttachment } from '../lib/types'

const ACCEPT =
  'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.heic,.webp'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(name: string, url: string): boolean {
  return /\.(png|jpe?g|gif|webp|heic|bmp|svg)$/i.test(name) || url.includes('image')
}

function isVideo(name: string): boolean {
  return /\.(mp4|mov|webm|m4v|avi)$/i.test(name)
}

interface OrderFilesPanelProps {
  files: ChecklistAttachment[]
  canUpload: boolean
  currentUserId: string
  canDeleteAny: boolean
  uploaderNames: Record<string, string>
  uploadProgress: number | null
  onUpload: (file: File) => void
  onDelete: (fileId: string) => void
}

export default function OrderFilesPanel({
  files,
  canUpload,
  currentUserId,
  canDeleteAny,
  uploaderNames,
  uploadProgress,
  onUpload,
  onDelete,
}: OrderFilesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busyName, setBusyName] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const orderFiles = useMemo(
    () => files.filter((f) => !f.item_id),
    [files],
  )

  function handlePick(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setBusyName(file.name)
    onUpload(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDownload(file: ChecklistAttachment) {
    setDownloadError(null)
    setDownloadingId(file.id)
    try {
      await downloadWorkFile(file.file_url, file.file_name)
    } catch {
      setDownloadError('Could not download that file. Try Open, then save from your browser.')
    }
    setDownloadingId(null)
  }

  async function handleOpen(file: ChecklistAttachment) {
    try {
      const url = await getAttachmentViewUrl(file.file_url)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(file.file_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <section className="order-files-panel" aria-label="Work files">
      <div className="order-files-header">
        <div>
          <h2>Work files</h2>
          <p className="muted-text small-text">
            Finished work, invoices, receipts, photos, or videos — shared on this directive.
          </p>
        </div>
        {canUpload && (
          <label className="btn btn-primary btn-sm order-files-upload-btn">
            {uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Add file'}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              hidden
              disabled={uploadProgress !== null}
              onChange={(e) => handlePick(e.target.files)}
            />
          </label>
        )}
      </div>

      {downloadError && <p className="muted-text small-text">{downloadError}</p>}

      {orderFiles.length === 0 ? (
        <p className="muted-text">
          {canUpload
            ? 'No files yet. Add a photo, PDF, video, or any work file (up to 50 MB).'
            : 'No files on this directive yet.'}
        </p>
      ) : (
        <ul className="order-files-list">
          {orderFiles.map((file) => {
            const canDelete =
              canDeleteAny || (!!file.uploaded_by && file.uploaded_by === currentUserId)
            const who = file.uploaded_by
              ? uploaderNames[file.uploaded_by] || 'Teammate'
              : 'Teammate'
            return (
              <li key={file.id} className="order-file-row">
                <div className="order-file-preview">
                  <FileThumb
                    fileName={file.file_name}
                    fileUrl={file.file_url}
                    isImage={isImage(file.file_name, file.file_url)}
                    isVideo={isVideo(file.file_name)}
                  />
                </div>
                <div className="order-file-meta">
                  <button
                    type="button"
                    className="order-file-name"
                    onClick={() => { void handleOpen(file) }}
                  >
                    {file.file_name}
                  </button>
                  <span className="muted-text small-text">
                    {who} · {formatSize(file.file_size)}
                    {busyName === file.file_name && uploadProgress !== null ? ' · uploading…' : ''}
                  </span>
                </div>
                <div className="order-file-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={downloadingId === file.id}
                    onClick={() => { void handleDownload(file) }}
                  >
                    {downloadingId === file.id ? 'Saving…' : 'Download'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { void handleOpen(file) }}
                  >
                    Open
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onDelete(file.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
