import { FormEvent, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import FileThumb from './FileThumb'
import { downloadWorkFile } from '../lib/downloadFile'
import type { ChecklistAttachment, ChecklistItem } from '../lib/types'

const FILE_ACCEPT =
  'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.heic,.webp'

function isImage(name: string, url: string): boolean {
  return /\.(png|jpe?g|gif|webp|heic|bmp|svg)$/i.test(name) || url.includes('image')
}

function isVideo(name: string): boolean {
  return /\.(mp4|mov|webm|m4v|avi)$/i.test(name)
}

/** Local-state input so typing never triggers an API call mid-keystroke */
function TaskInput({
  task,
  canEdit,
  onSave,
  multiline = false,
}: {
  task: string
  canEdit: boolean
  onSave: (val: string) => void
  multiline?: boolean
}) {
  const [value, setValue] = useState(task)

  useEffect(() => { setValue(task) }, [task])

  if (multiline) {
    return (
      <textarea
        className="objective-task-textarea"
        value={value}
        readOnly={!canEdit}
        rows={4}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { if (value !== task) onSave(value) }}
      />
    )
  }

  return (
    <input
      className="objective-task-input"
      value={value}
      readOnly={!canEdit}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value !== task) onSave(value) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
    />
  )
}

interface ObjectivesSidebarProps {
  items: ChecklistItem[]
  canEdit: boolean
  canToggle: boolean
  /** When true, opening a task card marks it Current for the Lead. */
  isAssignee: boolean
  currentItemId: string | null
  attachments: ChecklistAttachment[]
  onToggle: (itemId: string, completed: boolean) => void
  onTaskChange: (itemId: string, task: string) => void
  onDelete: (itemId: string) => void
  onAdd: (task: string) => void
  onReorder: (items: ChecklistItem[]) => void
  onSetCurrent: (itemId: string) => void
  onUpload: (itemId: string, file: File) => void
  onDeleteAttachment: (attachmentId: string) => void
  uploadProgress: number | null
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function ObjectivesSidebar({
  items,
  canEdit,
  canToggle,
  isAssignee,
  currentItemId,
  attachments,
  onToggle,
  onTaskChange,
  onDelete,
  onAdd,
  onReorder,
  onSetCurrent,
  onUpload,
  onDeleteAttachment,
  uploadProgress,
  mobileOpen,
  onCloseMobile,
}: ObjectivesSidebarProps) {
  const [newTask, setNewTask] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const ordered = useMemo(
    () => [...items].sort((a, b) => a.order - b.order || a.created_at.localeCompare(b.created_at)),
    [items],
  )

  const firstIncompleteIndex = useMemo(
    () => ordered.findIndex((item) => !item.completed),
    [ordered],
  )

  const lastCompletedIndex = useMemo(() => {
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      if (ordered[i].completed) return i
    }
    return -1
  }, [ordered])

  function canToggleItem(index: number, completed: boolean): boolean {
    if (!canToggle) return false
    if (!completed) {
      return index === firstIncompleteIndex
    }
    return index === lastCompletedIndex
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newTask.trim() || !canEdit) return
    onAdd(newTask.trim())
    setNewTask('')
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId || !canEdit) return
    // Current task cannot be moved
    if (draggingId === currentItemId) {
      setDraggingId(null)
      return
    }
    const draggedIndex = ordered.findIndex((item) => item.id === draggingId)
    const targetIndex = ordered.findIndex((item) => item.id === targetId)
    if (draggedIndex < 0 || targetIndex < 0) return
    const reordered = [...ordered]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    onReorder(reordered)
    setDraggingId(null)
  }

  function handleToggle(itemId: string, completed: boolean) {
    onToggle(itemId, completed)
    if (completed && expandedId === itemId) setExpandedId(null)
  }

  function handleOpenCard(item: ChecklistItem) {
    const next = expandedId === item.id ? null : item.id
    setExpandedId(next)
    // Current turns on when Crew opens an incomplete task card
    if (next && isAssignee && !item.completed) {
      onSetCurrent(item.id)
    }
  }

  const doneCount = ordered.filter((i) => i.completed).length
  const totalCount = ordered.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <aside className={clsx('objectives-sidebar', mobileOpen && 'objectives-sidebar-open')}>
      <div className="sidebar-header">
        <h2>Items</h2>
        <button type="button" className="btn btn-secondary btn-sm mobile-only" onClick={onCloseMobile}>
          ✕ Close
        </button>
      </div>

      {totalCount > 0 && (
        <>
          <div className="objectives-progress">
            <div className="objectives-progress-bar" style={{ width: `${pct}%` }} />
            <span className="objectives-progress-label">{doneCount}/{totalCount} done</span>
          </div>
          <p className="objectives-order-hint">
            {canEdit
              ? 'Lead can reorder anytime — the Current item stays locked. Team Members work top to bottom.'
              : 'Work in sequence — open an item to mark it Current. Mark done to unlock the next.'}
          </p>
        </>
      )}

      <div className="objectives-list">
        {ordered.length === 0 ? (
          <p className="muted-text">No items yet. Add your first item below.</p>
        ) : (
          ordered.map((item, index) => {
            const isExpanded = expandedId === item.id
            const isCurrent = currentItemId === item.id && !item.completed
            const canEditDetails = canEdit && !item.completed
            const canUploadFiles = canEdit || isAssignee
            const itemFiles = attachments.filter((file) => file.item_id === item.id)
            const canDrag = canEdit && !isCurrent && !item.completed
            const toggleAllowed = canToggleItem(index, item.completed)
            const lockedAhead = !item.completed && firstIncompleteIndex >= 0 && index > firstIncompleteIndex

            return (
              <div
                key={item.id}
                className={clsx(
                  'objective-item',
                  item.completed && 'objective-item-completed',
                  isExpanded && 'objective-item-expanded',
                  isCurrent && 'objective-item-current',
                  lockedAhead && 'objective-item-locked',
                )}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(item.id)}
              >
                <div className="objective-row">
                  {canEdit && (
                    canDrag ? (
                      <span
                        className="drag-handle"
                        draggable
                        onDragStart={() => setDraggingId(item.id)}
                        onDragEnd={() => setDraggingId(null)}
                        title="Drag to reorder"
                      >
                        ⠿
                      </span>
                    ) : (
                      <span
                        className="drag-handle drag-handle-locked"
                        title={isCurrent ? 'Current item is locked' : 'Done items stay in place'}
                        aria-hidden="true"
                      >
                        ⠿
                      </span>
                    )
                  )}

                  <span className="objective-number">{index + 1}.</span>

                  <label className="objective-checkbox">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      disabled={!toggleAllowed}
                      title={
                        lockedAhead
                          ? 'Finish the previous item first'
                          : item.completed && !toggleAllowed
                            ? 'Uncheck the latest finished item first'
                            : undefined
                      }
                      onChange={(event) => handleToggle(item.id, event.target.checked)}
                    />
                  </label>

                  <button
                    type="button"
                    className="objective-open-btn"
                    onClick={() => handleOpenCard(item)}
                    title={isExpanded ? 'Collapse item' : 'Open item'}
                  >
                    <span className="objective-task-preview">{item.task || 'Untitled item'}</span>
                    {isCurrent && <span className="current-pill">Current</span>}
                    <span className="objective-chevron" aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
                  </button>

                  <div className="objective-actions">
                    {canUploadFiles && (
                      <label className="btn btn-secondary btn-sm file-upload-btn" title="Attach file to this item">
                        📎
                        {itemFiles.length > 0 && (
                          <span className="file-count-badge">{itemFiles.length}</span>
                        )}
                        <input
                          type="file"
                          accept={FILE_ACCEPT}
                          hidden
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) onUpload(item.id, file)
                            event.currentTarget.value = ''
                          }}
                        />
                      </label>
                    )}
                    {canEditDetails && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        title="Delete item"
                        onClick={() => onDelete(item.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="objective-card">
                    {canEditDetails ? (
                      <>
                        <p className="objective-card-hint">
                          Edit item details before it is marked done. Attach files with 📎.
                        </p>
                        <TaskInput
                          task={item.task}
                          canEdit
                          multiline
                          onSave={(val) => onTaskChange(item.id, val)}
                        />
                      </>
                    ) : (
                      <>
                        <p className="objective-card-body">{item.task}</p>
                        {item.completed ? (
                          <p className="objective-card-locked">
                            Done — item details are locked. You can still add files or use Messages.
                          </p>
                        ) : lockedAhead ? (
                          <p className="objective-card-locked">
                            Locked until earlier items are marked done.
                          </p>
                        ) : (
                          <p className="objective-card-locked">
                            Only the Lead can edit item details. Attach files with 📎 or use Messages.
                          </p>
                        )}
                      </>
                    )}

                    {(itemFiles.length > 0 || canUploadFiles) && (
                      <div className="objective-files">
                        <p className="objective-files-label">Files on this item</p>
                        {itemFiles.length === 0 ? (
                          <p className="muted-text small-text">No files yet.</p>
                        ) : (
                          <ul className="objective-files-list">
                            {itemFiles.map((file) => (
                              <li key={file.id}>
                                <div className="objective-file-preview">
                                  <FileThumb
                                    fileName={file.file_name}
                                    fileUrl={file.file_url}
                                    isImage={isImage(file.file_name, file.file_url)}
                                    isVideo={isVideo(file.file_name)}
                                  />
                                </div>
                                <a href={file.file_url} target="_blank" rel="noreferrer">
                                  {file.file_name}
                                </a>
                                <div className="objective-files-actions">
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                      void downloadWorkFile(file.file_url, file.file_name)
                                    }}
                                  >
                                    Download
                                  </button>
                                  {(canEdit || isAssignee) && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => onDeleteAttachment(file.id)}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm objective-card-close"
                      onClick={() => setExpandedId(null)}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {uploadProgress !== null && (
        <div className="upload-progress">
          <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span className="upload-progress-label">Uploading {uploadProgress}%</span>
        </div>
      )}

      {canEdit && (
        <form className="add-item-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Add new item…"
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Add
          </button>
        </form>
      )}
    </aside>
  )
}
