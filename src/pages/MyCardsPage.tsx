import { useEffect, useState } from 'react'
import Alert from '../components/Alert'
import ChecklistCard from '../components/ChecklistCard'
import { useAuth } from '../hooks/useAuth'
import { fetchAssignedCards } from '../lib/checklistApi'
import type { DashboardChecklist } from '../lib/types'

export default function MyCardsPage() {
  const { displayName } = useAuth()
  const [cards, setCards] = useState<DashboardChecklist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchAssignedCards()
      .then((data) => { if (mounted) { setCards(data); setLoading(false) } })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load jobs')
          setLoading(false)
        }
      })
    return () => { mounted = false }
  }, [])

  const active  = cards.filter((c) => c.status === 'active')
  const waiting = cards.filter((c) => c.status === 'awaiting_confirmation')
  const done    = cards.filter((c) => c.status === 'archived')

  const greeting = displayName ? `${displayName}'s Jobs` : 'My Jobs'

  return (
    <section className="dashboard-page">
      <div className="page-banner page-banner-crew">
        <div className="banner-content">
          <h1 className="banner-title">{greeting}</h1>
          <p className="banner-sub">Your assigned orders — check tasks, post updates, mark complete</p>
        </div>
      </div>

      {error && <Alert variant="error" message={error} />}

      {loading ? (
        <p className="muted-text">Loading your jobs…</p>
      ) : cards.length === 0 ? (
        <div className="empty-state">
          <p className="muted-text">No jobs assigned to you yet.</p>
          <p className="muted-text small-text">Your Lead will assign orders and notify you — turn on notifications in Profile (must have notifications enabled on your device/s).</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="card-group">
              <h2 className="card-group-title">🟢 Active</h2>
              <div className="checklist-grid">
                {active.map((card) => (
                  <ChecklistCard key={card.id} checklist={card} showStatus />
                ))}
              </div>
            </div>
          )}
          {waiting.length > 0 && (
            <div className="card-group">
              <h2 className="card-group-title">🟡 Awaiting Review</h2>
              <div className="checklist-grid">
                {waiting.map((card) => (
                  <ChecklistCard key={card.id} checklist={card} showStatus />
                ))}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div className="card-group">
              <h2 className="card-group-title">📁 Completed</h2>
              <div className="checklist-grid">
                {done.map((card) => (
                  <ChecklistCard key={card.id} checklist={card} showStatus />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
