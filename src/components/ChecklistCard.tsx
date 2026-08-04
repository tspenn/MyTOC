import { Link } from 'react-router-dom'
import type { DashboardChecklist } from '../lib/types'

const STATUS_LABELS: Record<string, string> = {
  active:                'Active',
  awaiting_confirmation: 'Awaiting Review',
  archived:              'Archived',
}

const STATUS_EMOJI: Record<string, string> = {
  active:                '🟢',
  awaiting_confirmation: '🟡',
  archived:              '📁',
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

interface ChecklistCardProps {
  checklist: DashboardChecklist
  onDelete?:  (id: string) => void
  onShare?:   (id: string) => void
  onConfirm?: (id: string) => void
  onReject?:  (id: string) => void
  showStatus?: boolean
}

export default function ChecklistCard({
  checklist,
  onDelete,
  onShare,
  onConfirm,
  onReject,
  showStatus = false,
}: ChecklistCardProps) {
  return (
    <article className="checklist-card">
      <div className="checklist-card-body">
        <div className="card-title-row">
          <h2>{checklist.title}</h2>
          {showStatus && (
            <span className={`status-pill status-pill-${checklist.status}`}>
              {STATUS_EMOJI[checklist.status]} {STATUS_LABELS[checklist.status] ?? checklist.status}
            </span>
          )}
        </div>
        {checklist.description && (
          <p className="muted-text checklist-card-desc">{checklist.description}</p>
        )}
        <dl className="checklist-meta">
          <div>
            <dt>Tasks</dt>
            <dd>{checklist.item_count}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDate(checklist.updated_at)}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(checklist.created_at)}</dd>
          </div>
        </dl>
      </div>

      <div className="button-row">
        <Link to={`/checklist/${checklist.id}`} className="btn btn-primary btn-sm">
          Open Order
        </Link>
        {onShare && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onShare(checklist.id)}>
            👥 Assign
          </button>
        )}
        {onConfirm && (
          <button type="button" className="btn btn-success btn-sm" onClick={() => onConfirm(checklist.id)}>
            ✓ Confirm
          </button>
        )}
        {onReject && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onReject(checklist.id)}>
            ↩ Reject
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              if (window.confirm('Delete this order?')) onDelete(checklist.id)
            }}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  )
}
