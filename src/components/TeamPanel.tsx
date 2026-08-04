import { FormEvent, useEffect, useState } from 'react'
import Alert from './Alert'
import FormField from './FormField'
import CoLeadsPanel from './CoLeadsPanel'
import { createTeamSlot, ensureLeadCode, fetchTeamSlots } from '../lib/checklistApi'
import { useAuth } from '../hooks/useAuth'
import type { TeamSlot } from '../lib/types'
import { copyToClipboard, formatTeamMemberLabel, teamInviteSms, teamSignupUrl } from '../lib/teamAuth'

export default function TeamPanel() {
  const { isPrimaryLead } = useAuth()
  const [leadCode, setLeadCode] = useState<string | null>(null)
  const [slots, setSlots] = useState<TeamSlot[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const code = await ensureLeadCode()
      setLeadCode(code)
      const roster = await fetchTeamSlots()
      setSlots(roster)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load team roster')
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError(null)
    try {
      await createTeamSlot(newName.trim())
      setNewName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add team member')
    }
    setAdding(false)
  }

  async function handleCopy(key: string, text: string) {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  if (loading) {
    return <p className="muted-text">Loading team…</p>
  }

  return (
    <div className="team-panel">
      {error && <Alert variant="error" message={error} />}

      <CoLeadsPanel isPrimaryLead={isPrimaryLead} />

      <div className="team-lead-id-block">
        <div>
          <h2>Your Lead ID</h2>
          <p className="muted-text">
            Team members use this ID plus their worker # to sign up — no email required.
          </p>
        </div>
        {leadCode && (
          <div className="team-lead-id-row">
            <span className="team-lead-id">{leadCode}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void handleCopy('lead-id', leadCode)}
            >
              {copied === 'lead-id' ? 'Copied!' : 'Copy ID'}
            </button>
          </div>
        )}
      </div>

      <form className="team-add-form" onSubmit={handleAdd}>
        <h2>Add team member</h2>
        <p className="muted-text">Creates a worker # — then copy the link or text message to send from your phone.</p>
        <div className="team-add-row">
          <FormField
            id="team-member-name"
            label="Name"
            value={newName}
            onChange={setNewName}
            autoComplete="name"
          />
          <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

      <div className="team-roster">
        <h2>Team roster</h2>
        {slots.length === 0 ? (
          <p className="muted-text">No team members yet. Add someone above, then text them the invite.</p>
        ) : (
          <ul className="team-roster-list">
            {slots.map((slot) => {
              const label = formatTeamMemberLabel(slot.display_name, slot.worker_number)
              const linkKey = `link-${slot.id}`
              const smsKey = `sms-${slot.id}`
              const link = leadCode ? teamSignupUrl(leadCode, slot.worker_number) : ''
              const sms = leadCode ? teamInviteSms(leadCode, slot.worker_number, slot.display_name) : ''
              return (
                <li key={slot.id} className="team-roster-item">
                  <div className="team-roster-info">
                    <strong>{label}</strong>
                    <span className={`team-status team-status-${slot.status}`}>
                      {slot.status === 'active' ? 'Signed up ✓' : 'Waiting to sign up'}
                    </span>
                  </div>
                  {slot.status === 'pending' && leadCode && (
                    <div className="team-roster-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => void handleCopy(linkKey, link)}
                      >
                        {copied === linkKey ? 'Link copied!' : 'Copy link'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void handleCopy(smsKey, sms)}
                      >
                        {copied === smsKey ? 'Message copied!' : 'Copy text message'}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
