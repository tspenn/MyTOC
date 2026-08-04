import { FormEvent, useEffect, useState } from 'react'
import Alert from './Alert'
import FormField from './FormField'
import {
  fetchCoLeadInvites,
  fetchTeamLeads,
  inviteCoLead,
} from '../lib/checklistApi'
import { coLeadInviteUrl, copyToClipboard } from '../lib/teamAuth'
import type { CoLeadInvite, TeamLeadMember } from '../lib/types'

interface CoLeadsPanelProps {
  isPrimaryLead: boolean
}

export default function CoLeadsPanel({ isPrimaryLead }: CoLeadsPanelProps) {
  const [leads, setLeads] = useState<TeamLeadMember[]>([])
  const [invites, setInvites] = useState<CoLeadInvite[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [leadList, pending] = await Promise.all([
        fetchTeamLeads(),
        isPrimaryLead ? fetchCoLeadInvites() : Promise.resolve([]),
      ])
      setLeads(leadList)
      setInvites(pending)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load co-Leads')
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [isPrimaryLead])

  async function handleInvite(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    setError(null)
    try {
      await inviteCoLead(email.trim())
      setEmail('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not invite co-Lead')
    }
    setInviting(false)
  }

  async function handleCopy(token: string) {
    const ok = await copyToClipboard(coLeadInviteUrl(token))
    if (ok) {
      setCopied(token)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  if (loading) {
    return <p className="muted-text">Loading Leads…</p>
  }

  const canInviteMore = isPrimaryLead && leads.length < 2

  return (
    <div className="co-leads-panel">
      {error && <Alert variant="error" message={error} />}

      <h2>Lead team</h2>
      <p className="muted-text">
        All Leads share the same board, directives, and roster. Coach and Admin plans include 2 Lead seats.
      </p>

      <ul className="co-leads-list">
        {leads.map((lead) => (
          <li key={lead.user_id} className="co-leads-item">
            <strong>{lead.display_name}</strong>
            <span className="co-leads-badge">
              {lead.is_primary ? 'Primary Lead' : 'Co-Lead'}
            </span>
          </li>
        ))}
      </ul>

      {isPrimaryLead && canInviteMore && (
        <form className="co-leads-invite-form" onSubmit={handleInvite}>
          <h3>Invite co-Lead</h3>
          <p className="muted-text small-text">
            Add a second parent or manager — they&apos;ll use the same dashboard and see lead notes.
          </p>
          <div className="co-leads-invite-row">
            <FormField
              id="co-lead-email"
              label="Co-Lead email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <button type="submit" className="btn btn-primary" disabled={inviting || !email.trim()}>
              {inviting ? 'Inviting…' : 'Invite'}
            </button>
          </div>
        </form>
      )}

      {isPrimaryLead && invites.length > 0 && (
        <div className="co-leads-pending">
          <h3>Pending invites</h3>
          <ul className="co-leads-pending-list">
            {invites.map((invite) => (
              <li key={invite.id} className="co-leads-pending-item">
                <span>{invite.email}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void handleCopy(invite.token)}
                >
                  {copied === invite.token ? 'Link copied!' : 'Copy invite link'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
