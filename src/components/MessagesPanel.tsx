import { FormEvent, useMemo, useState } from 'react'
import type { ChecklistComment, ChecklistItem } from '../lib/types'

interface MessagesPanelProps {
  title: string
  items: ChecklistItem[]
  comments: ChecklistComment[]
  authorNames: Record<string, string>
  canComment: boolean
  currentUserId: string
  /** Pass null itemId for a directive-wide note (not tied to an item). */
  onAddComment: (itemId: string | null, text: string) => void
}

const DIRECTIVE_WIDE = ''

function formatMsgDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    hour12: true,
  })
}

export default function MessagesPanel({
  title,
  items,
  comments,
  authorNames,
  canComment,
  currentUserId,
  onAddComment,
}: MessagesPanelProps) {
  const [selectedItemId, setSelectedItemId] = useState(DIRECTIVE_WIDE)
  const [text, setText] = useState('')

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item.task])),
    [items],
  )

  const sorted = useMemo(
    () => [...comments].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
    [comments],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim() || !canComment) return
    const itemId = selectedItemId === DIRECTIVE_WIDE ? null : selectedItemId
    onAddComment(itemId, text.trim())
    setText('')
  }

  return (
    <section className="messages-panel">
      <div className="messages-panel-header">
        <h2>Messages About — <span className="messages-panel-title">{title}</span></h2>
      </div>

      <div className="messages-table-wrap">
        {sorted.length === 0 ? (
          <p className="muted-text messages-empty">
            No messages yet. Send a note on the whole directive, or about a specific item.
          </p>
        ) : (
          <table className="messages-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>From</th>
                <th>Message</th>
                <th>Re:</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((comment) => {
                const isMe = comment.user_id === currentUserId
                const name = authorNames[comment.user_id]
                  ?? (isMe ? 'You' : `User…${comment.user_id.slice(-4)}`)
                const task = comment.item_id
                  ? (itemMap.get(comment.item_id) ?? 'Item')
                  : 'Whole directive'
                return (
                  <tr key={comment.id} className={isMe ? 'msg-row-mine' : ''}>
                    <td className="msg-date">{formatMsgDate(comment.created_at)}</td>
                    <td className="msg-from">
                      <span className="msg-avatar">{name.charAt(0).toUpperCase()}</span>
                      {name}
                    </td>
                    <td className="msg-text">{comment.text}</td>
                    <td className="msg-item" title={task}>
                      {task.length > 24 ? `${task.slice(0, 22)}…` : task}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {canComment && (
        <form className="message-compose" onSubmit={handleSubmit}>
          <select
            className="message-compose-item"
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            aria-label="Message about"
          >
            <option value={DIRECTIVE_WIDE}>Whole directive</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.task.length > 40 ? `${item.task.slice(0, 38)}…` : item.task}
              </option>
            ))}
          </select>
          <textarea
            className="message-compose-text"
            placeholder="e.g. Looks good — please attach the final PDF. Or: use landscape images…"
            value={text}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary message-compose-send">
            Send
          </button>
        </form>
      )}
    </section>
  )
}
