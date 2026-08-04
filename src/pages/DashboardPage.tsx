import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '../components/Alert'
import ChecklistCard from '../components/ChecklistCard'
import CreateChecklistModal from '../components/CreateChecklistModal'
import { useAuth } from '../hooks/useAuth'
import { useDashboardStore } from '../stores/dashboardStore'
import type { CardStatus } from '../lib/types'

const STATUS_TABS: { value: CardStatus; label: string; emoji: string }[] = [
  { value: 'active',                label: 'Active',               emoji: '🟢' },
  { value: 'awaiting_confirmation', label: 'Awaiting Review',      emoji: '🟡' },
  { value: 'archived',              label: 'Archive',              emoji: '📁' },
]

export default function DashboardPage() {
  const { user, displayName } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)

  const allChecklists    = useDashboardStore((state) => state.checklists)
  const activeTab        = useDashboardStore((state) => state.activeTab)
  const loading          = useDashboardStore((state) => state.loading)
  const error            = useDashboardStore((state) => state.error)
  const loadChecklists   = useDashboardStore((state) => state.loadChecklists)
  const subscribe        = useDashboardStore((state) => state.subscribe)
  const unsubscribe      = useDashboardStore((state) => state.unsubscribe)
  const addChecklist     = useDashboardStore((state) => state.addChecklist)
  const removeChecklist  = useDashboardStore((state) => state.removeChecklist)
  const setActiveTab     = useDashboardStore((state) => state.setActiveTab)
  const confirmChecklist = useDashboardStore((state) => state.confirmChecklist)
  const rejectChecklist  = useDashboardStore((state) => state.rejectChecklist)

  const checklists    = allChecklists.filter((c) => c.status === activeTab)
  const awaitingCount = allChecklists.filter((c) => c.status === 'awaiting_confirmation').length

  // Pre-select tab from URL param e.g. /dashboard?tab=archived
  useEffect(() => {
    const tab = searchParams.get('tab') as CardStatus | null
    if (tab && ['active', 'awaiting_confirmation', 'archived'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams, setActiveTab])

  useEffect(() => {
    if (!user) return
    void loadChecklists(user.id)
    subscribe(user.id)
    return () => { unsubscribe() }
  }, [user, loadChecklists, subscribe, unsubscribe])

  async function handleCreate(title: string, description: string) {
    if (!user) return null
    const id = await addChecklist(user.id, title, description)
    if (id) navigate(`/checklist/${id}`)
    return id
  }

  const greeting = displayName ? `${displayName}'s Orders` : 'My Orders'

  return (
    <section className="dashboard-page">
      <div className="page-banner page-banner-lead">
        <div className="banner-content">
          <h1 className="banner-title">{greeting}</h1>
          <p className="banner-sub">Lead dashboard — create orders, assign operators, review completions</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreateOpen(true)}
        >
          + New Order
        </button>
      </div>

      {error && <Alert variant="error" message={error} />}

      <div className="status-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`status-tab ${activeTab === tab.value ? 'status-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.value)}
          >
            <span>{tab.emoji}</span>
            {tab.label}
            {tab.value === 'awaiting_confirmation' && awaitingCount > 0 && (
              <span className="tab-badge">{awaitingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Onboarding tip — shown only when Lead has zero orders ever */}
      {!loading && allChecklists.length === 0 && (
        <div className="onboarding-tip">
          <span className="onboarding-tip-icon">👋</span>
          <div>
            <strong>Welcome to MyTOC</strong>
            <p>You're the Lead — create your first order, add tasks, then assign operators to execute.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            Create your first order →
          </button>
        </div>
      )}

      {loading ? (
        <p className="muted-text">Loading orders…</p>
      ) : checklists.length === 0 && allChecklists.length > 0 ? (
        <div className="empty-state">
          <p className="muted-text">Nothing in this category.</p>
        </div>
      ) : (
        <div className="checklist-grid">
          {checklists.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              onDelete={activeTab !== 'archived' ? (id) => void removeChecklist(id) : undefined}
              onShare={(id) => navigate(`/checklist/${id}?share=1`)}
              onConfirm={
                activeTab === 'awaiting_confirmation' && user
                  ? (id) => void confirmChecklist(id, user.id)
                  : undefined
              }
              onReject={
                activeTab === 'awaiting_confirmation' && user
                  ? (id) => void rejectChecklist(id, user.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <CreateChecklistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </section>
  )
}
