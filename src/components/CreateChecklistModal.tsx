import { FormEvent, useState } from 'react'
import Modal from './Modal'
import FormField from './FormField'

interface CreateChecklistModalProps {
  open: boolean
  onClose: () => void
  onCreate: (title: string, description: string) => Promise<string | null>
}

export default function CreateChecklistModal({ open, onClose, onCreate }: CreateChecklistModalProps) {
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    const id = await onCreate(title.trim(), description.trim())
    setLoading(false)

    if (id) {
      setTitle('')
      setDescription('')
      onClose()
    }
  }

  return (
    <Modal title="New Directive" open={open} onClose={onClose}>
      <form className="stack-form" onSubmit={handleSubmit}>
        <FormField
          id="create-title"
          label="Directive title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Final board deck numbers"
        />
        <label className="form-field" htmlFor="create-description">
          <span>Brief <span className="field-optional">(optional)</span></span>
          <textarea
            id="create-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="What needs to happen…"
          />
        </label>
        <p className="muted-text small-text">
          Assign a team member and add items after you create the directive.
        </p>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating…' : '✓ Create Directive'}
        </button>
      </form>
    </Modal>
  )
}
