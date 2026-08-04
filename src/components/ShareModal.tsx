import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from './Modal'
import FormField from './FormField'
import Alert from './Alert'
import {
  createTeamSlot,
  ensureLeadCode,
  fetchTeamSlots,
} from '../lib/checklistApi'
import {
  copyToClipboard,
  formatTeamMemberLabel,
  teamInviteMailto,
  teamInviteSms,
  teamSignupUrl,
} from '../lib/teamAuth'
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

export default function ShareModal({
  open,
  onClose,
  collaborators,
  onInviteRoster,
  onRemove,
  error,
}: ShareModalProps) {
  const [leadCode, setLeadCode] = useState<string | null>(null)
  const [roster, setRoster] = useState<TeamSlot[]>([])
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadRoster() {
    setLoading(true)
    setLocalError(null)
    try {
      const code = await ensureLeadCode()
      setLeadCode(code)
      setRoster(await fetchTeamSlots())
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not load team roster')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return
    void loadRoster()
  }, [open])

  const assignedUserIds = new Set(collaborators.map((c) => c.user_id))
  const displayError = error ?? localError

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setLocalError(null)
    try {
      await createTeamSlot(newName.trim())
      setNewName('')
      await loadRoster()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not add team member')
    }
    setAdding(false)
  }

  async function handleAssign(slotId: string) {
    setAssigningId(slotId)
    setLocalError(null)
    try {
      await onInviteRoster(slotId, 'assignee')
      await loadRoster()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not assign team member')
    }
    setAssigningId(null)
  }

  async function handleCopy(key: string, text: string) {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  return (
    <Modal title="Assign Team" open={open} onClose={onClose}>
      {displayError && <Alert variant="error" message={displayError} />}

      <p className="muted-text small-text share-intro">
        Add someone by name to get a worker #, send them the invite link, then assign this directive.
        They get a Web Push notification when assigned (notifications must be on on their device).
      </p>

      <form className="team-add-row share-add-row" onSubmit={handleAddMember}>
        <FormField
          id="assign-member-name"
          label="Add team member"
          value={newName}
          onChange={setNewName}
          autoComplete="name"
        />
        <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()}>
          {adding ? 'Adding…' : 'Add & get #'}
        </button>
      </form>

      <div className="share-roster">
        <h3>Your roster</h3>
        {loading ? (
          <p className="muted-text">Loading roster…</p>
        ) : roster.length === 0 ? (
          <p className="muted-text">
            No team members yet. Add a name above, then copy the invite link to send from your phone or email.
          </p>
        ) : (
          <ul className="share-roster-list">
            {roster.map((slot) => {
              const label = formatTeamMemberLabel(slot.display_name, slot.worker_number)
              const alreadyAssigned = !!slot.user_id && assignedUserIds.has(slot.user_id)
              const link = leadCode ? teamSignupUrl(leadCode, slot.worker_number) : ''
              const message = leadCode
                ? teamInviteSms(leadCode, slot.worker_number, slot.display_name)
                : ''
              const mailto = leadCode
                ? teamInviteMailto(leadCode, slot.worker_number, slot.display_name)
                : ''
              const linkKey = `link-${slot.id}`
              const msgKey = `msg-${slot.id}`

              return (
                <li key={slot.id} className="share-roster-item">
                  <div className="share-roster-info">
                    <strong>{label}</strong>
                    <span className={`team-status team-status-${slot.status}`}>
                      {alreadyAssigned
                        ? 'On this directive'
                        : slot.status === 'active'
                          ? 'Signed up — ready to assign'
                          : 'Waiting to sign up'}
                    </span>
                  </div>

                  <div className="share-roster-actions">
                    {slot.status === 'pending' && leadCode && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => void handleCopy(linkKey, link)}
                        >
                          {copied === linkKey ? 'Link copied!' : 'Copy link'}
                        </button>
                        <a className="btn btn-secondary btn-sm" href={mailto}>
                          Email invite
                        </a>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void handleCopy(msgKey, message)}
                        >
                          {copied === msgKey ? 'Message copied!' : 'Copy message'}
                        </button>
                      </>
                    )}

                    {slot.status === 'active' && !alreadyAssigned && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={assigningId === slot.id}
                        onClick={() => void handleAssign(slot.id)}
                      >
                        {assigningId === slot.id ? 'Assigning…' : 'Assign & Notify'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="muted-text small-text">
        Full roster & Lead ID also live under <Link to="/settings">Settings → Team</Link>.
      </p>

      <div className="collaborator-list">
        <h3>Assigned to this directive</h3>
        {collaborators.length === 0 ? (
          <p className="muted-text">No team members on this directive yet.</p>
        ) : (
          <ul>
            {collaborators.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>
                    {c.displayName && c.workerNumber
                      ? formatTeamMemberLabel(c.displayName, c.workerNumber)
                      : c.displayName || c.email || `User …${c.user_id.slice(-6)}`}
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
