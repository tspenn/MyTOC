import { FormEvent, useEffect, useState } from 'react'
import Modal from './Modal'
import FormField from './FormField'
import Alert from './Alert'
import type { Checklist } from '../lib/types'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  checklist: Checklist | null
  onSave: (title: string, description: string) => Promise<void>
  onDelete: () => Promise<void>
  onManageCollaborators: () => void
  error: string | null
}

export default function SettingsModal({
  open,
  onClose,
  checklist,
  onSave,
  onDelete,
  onManageCollaborators,
  error,
}: SettingsModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (checklist) {
      setTitle(checklist.title)
      setDescription(checklist.description ?? '')
    }
  }, [checklist])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    await onSave(title.trim(), description.trim())
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    const confirmed = window.confirm('Delete this checklist and all items, comments, and attachments?')
    if (!confirmed) return
    await onDelete()
  }

  return (
    <Modal title="Order details" open={open} onClose={onClose}>
      {error && <Alert variant="error" message={error} />}

      <p className="muted-text" style={{ marginTop: 0 }}>
        Overview for this order — title, instructions, and links. App help lives in Settings.
      </p>

      <form className="stack-form" onSubmit={handleSave}>
        <FormField id="settings-title" label="Title" value={title} onChange={setTitle} />
        <label className="form-field" htmlFor="settings-description">
          <span>Overview / description</span>
          <textarea
            id="settings-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </label>

        <div className="button-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onManageCollaborators}>
            Manage collaborators
          </button>
        </div>
      </form>

      <div className="danger-zone">
        <h3>Delete order</h3>
        <p className="muted-text">This permanently removes the order and all related data.</p>
        <button type="button" className="btn btn-danger" onClick={() => void handleDelete()}>
          Delete order
        </button>
      </div>
    </Modal>
  )
}
