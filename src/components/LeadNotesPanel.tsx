import { FormEvent, useMemo, useState } from 'react'
import type { LeadNote } from '../lib/types'

interface LeadNotesPanelProps {
  notes: LeadNote[]
  authorNames: Record<string, string>
  currentUserId: string
  canPost: boolean
  onAddNote: (text: string) => void
}

function formatNoteDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function LeadNotesPanel({
  notes,
  authorNames,
  currentUserId,
  canPost,
  onAddNote,
}: LeadNotesPanelProps) {
  const [text, setText] = useState('')

  const sorted = useMemo(
    () => [...notes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
    [notes],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim() || !canPost) return
    onAddNote(text.trim())
    setText('')
  }

  return (
    <section className="lead-notes-panel">
      <div className="lead-notes-header">
        <h2>Lead notes</h2>
        <p className="muted-text small-text">
          Private to Leads on your team — team members cannot see these.
        </p>
      </div>

      <div className="lead-notes-list-wrap">
        {sorted.length === 0 ? (
          <p className="muted-text lead-notes-empty">
            No lead notes yet. Coordinate here — e.g. &ldquo;I&apos;ll be home early and will make sure this gets done.&rdquo;
          </p>
        ) : (
          <ul className="lead-notes-list">
            {sorted.map((note) => {
              const isMe = note.user_id === currentUserId
              const name = authorNames[note.user_id]
                ?? (isMe ? 'You' : `Lead…${note.user_id.slice(-4)}`)
              return (
                <li key={note.id} className="lead-note-item">
                  <div className="lead-note-meta">
                    <strong>{name}</strong>
                    <span className="lead-note-date">{formatNoteDate(note.created_at)}</span>
                  </div>
                  <p className="lead-note-text">{note.text}</p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {canPost && (
        <form className="lead-notes-compose" onSubmit={handleSubmit}>
          <textarea
            className="lead-notes-input"
            placeholder="Note for other Leads on this directive…"
            value={text}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-secondary btn-sm" disabled={!text.trim()}>
            Add note
          </button>
        </form>
      )}
    </section>
  )
}
