import { FormEvent, useEffect, useState } from 'react'
import Modal from './Modal'
import FormField from './FormField'
import Alert from './Alert'
import { fetchTeamSlots } from '../lib/checklistApi'
import { formatTeamMemberLabel } from '../lib/teamAuth'
import type { CollaboratorProfile, CollaboratorRole, TeamSlot } from '../lib/types'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  collaborators: CollaboratorProfile[]
  onInvite: (email: string, role: CollaboratorRole) => Promise<void>
  onInviteRoster: (slotId: string, role: CollaboratorRole) => Promise<void>
  onRemove: (id: string) => Promise<void>
  error: string | null
}

const ROLE_LABELS: Record<CollaboratorRole, string> = {
  assignee: 'Team Member — works directive items, marks done, posts messages',
  editor:   'Co-Lead — full edit access',
  viewer:   'Viewer — read-only',
}

export default function ShareModal({
  open,
  onClose,
  collaborators,
  onInvite,
  onInviteRoster,
  onRemove,
  error,
}: ShareModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<CollaboratorRole>('assignee')
  const [submitting, setSubmitting] = useState(false)
  const [roster, setRoster] = useState<TeamSlot[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [useEmail, setUseEmail] = useState(false)

  useEffect(() => {
    if (!open) return
    void fetchTeamSlots().then((slots) => {
      const active = slots.filter((s) => s.status === 'active' && s.user_id)
      setRoster(active)
      setSelectedSlotId(active[0]?.id ?? '')
      setUseEmail(active.length === 0)
    })
  }, [open])

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    if (useEmail) {
      if (!email.trim()) {
        setSubmitting(false)
        return
      }
      await onInvite(email.trim(), role)
      setEmail('')
    } else if (selectedSlotId) {
      await onInviteRoster(selectedSlotId, role)
    }
    setSubmitting(false)
  }

  return (
    <Modal title="Assign Team" open={open} onClose={onClose}>
      {error && <Alert variant="error" message={error} />}

      {roster.length > 0 && (
        <div className="share-invite-mode" role="group" aria-label="Invite method">
          <button
            type="button"
            className={!useEmail ? 'share-mode-btn share-mode-active' : 'share-mode-btn'}
            onClick={() => setUseEmail(false)}
          >
            From roster
          </button>
          <button
            type="button"
            className={useEmail ? 'share-mode-btn share-mode-active' : 'share-mode-btn'}
            onClick={() => setUseEmail(true)}
          >
            By email
          </button>
        </div>
      )}

      <form className="stack-form" onSubmit={handleInvite}>
        {!useEmail && roster.length > 0 ? (
          <label className="form-field" htmlFor="invite-roster">
            <span>Team member</span>
            <select
              id="invite-roster"
              value={selectedSlotId}
              onChange={(event) => setSelectedSlotId(event.target.value)}
            >
              {roster.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {formatTeamMemberLabel(slot.display_name, slot.worker_number)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <FormField
              id="invite-email"
              label="Team member email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            {roster.length === 0 && (
              <p className="muted-text small-text">
                Add team members under Settings → Team to assign without email.
              </p>
            )}
          </>
        )}
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
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || (!useEmail && !selectedSlotId) || (useEmail && !email.trim())}
        >
          {submitting ? 'Sending…' : '📨 Assign & Notify'}
        </button>
      </form>

      <div className="collaborator-list">
        <h3>Assigned Team</h3>
        {collaborators.length === 0 ? (
          <p className="muted-text">No team members assigned yet.</p>
        ) : (
          <ul>
            {collaborators.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>
                    {c.displayName && c.workerNumber
                      ? formatTeamMemberLabel(c.displayName, c.workerNumber)
                      : c.email ?? `User …${c.user_id.slice(-6)}`}
                  </strong>
                  <span className={`role-pill role-pill-${c.role}`}>
                    {c.role === 'assignee' ? 'Team Member' : c.role === 'editor' ? 'Co-Lead' : 'Viewer'}
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
