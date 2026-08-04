import { FormEvent, useState } from 'react'
import Modal from './Modal'
import FormField from './FormField'
import Alert from './Alert'
import type { CollaboratorProfile, CollaboratorRole } from '../lib/types'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  collaborators: CollaboratorProfile[]
  onInvite: (email: string, role: CollaboratorRole) => Promise<void>
  onRemove: (id: string) => Promise<void>
  error: string | null
}

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  assignee: 'Crew — checks tasks, marks complete, posts messages',
  editor:   'Co-Lead — full edit access',
  viewer:   'Viewer — read-only',
}

export default function ShareModal({
  open,
  onClose,
  collaborators,
  onInvite,
  onRemove,
  error,
}: ShareModalProps) {
  const [email,      setEmail]      = useState('')
  const [role,       setRole]       = useState<CollaboratorRole>('assignee')
  const [submitting, setSubmitting] = useState(false)

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    await onInvite(email.trim(), role)
    setSubmitting(false)
    setEmail('')
  }

  return (
    <Modal title="Assign Crew" open={open} onClose={onClose}>
      {error && <Alert variant="error" message={error} />}

      <form className="stack-form" onSubmit={handleInvite}>
        <FormField
          id="invite-email"
          label="Crew member email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <label className="form-field" htmlFor="invite-role">
          <span>Role</span>
          <select
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value as CollaboratorRole)}
          >
            {(Object.entries(ROLE_LABELS) as [CollaboratorRole, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : '📨 Assign & Notify'}
        </button>
      </form>

      <div className="collaborator-list">
        <h3>Assigned Crew</h3>
        {collaborators.length === 0 ? (
          <p className="muted-text">No crew assigned yet.</p>
        ) : (
          <ul>
            {collaborators.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{c.email ?? `User …${c.user_id.slice(-6)}`}</strong>
                  <span className={`role-pill role-pill-${c.role}`}>
                    {c.role === 'assignee' ? 'Crew' : c.role === 'editor' ? 'Co-Lead' : 'Viewer'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void onRemove(c.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
