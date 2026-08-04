import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Alert from '../components/Alert'
import MessagesPanel from '../components/MessagesPanel'
import ObjectivesSidebar from '../components/ObjectivesSidebar'
import SettingsModal from '../components/SettingsModal'
import ShareModal from '../components/ShareModal'
import { useAuth } from '../hooks/useAuth'
import { useChecklistDetailStore } from '../stores/checklistDetailStore'

const STATUS_LABELS: Record<string, string> = {
  active:                'Active',
  awaiting_confirmation: 'Awaiting Review',
  archived:              'Archived',
}

export default function ChecklistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isCrew } = useAuth()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shareOpen,    setShareOpen]    = useState(searchParams.get('share') === '1')
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [completing,   setCompleting]   = useState(false)

  const checklist        = useChecklistDetailStore((state) => state.checklist)
  const items            = useChecklistDetailStore((state) => state.items)
  const comments         = useChecklistDetailStore((state) => state.comments)
  const collaborators    = useChecklistDetailStore((state) => state.collaborators)
  const navigationIds    = useChecklistDetailStore((state) => state.navigationIds)
  const authorEmails     = useChecklistDetailStore((state) => state.authorEmails)
  const loading          = useChecklistDetailStore((state) => state.loading)
  const accessDenied     = useChecklistDetailStore((state) => state.accessDenied)
  const error            = useChecklistDetailStore((state) => state.error)
  const uploadProgress   = useChecklistDetailStore((state) => state.uploadProgress)

  const loadChecklist            = useChecklistDetailStore((state) => state.loadChecklist)
  const subscribe                = useChecklistDetailStore((state) => state.subscribe)
  const reset                    = useChecklistDetailStore((state) => state.reset)
  const toggleItem               = useChecklistDetailStore((state) => state.toggleItem)
  const updateItemTask           = useChecklistDetailStore((state) => state.updateItemTask)
  const addItem                  = useChecklistDetailStore((state) => state.addItem)
  const removeItem               = useChecklistDetailStore((state) => state.removeItem)
  const reorderLocalItems        = useChecklistDetailStore((state) => state.reorderLocalItems)
  const markItemCurrent          = useChecklistDetailStore((state) => state.markItemCurrent)
  const addComment               = useChecklistDetailStore((state) => state.addComment)
  const saveSettings             = useChecklistDetailStore((state) => state.saveSettings)
  const deleteCurrentChecklist   = useChecklistDetailStore((state) => state.deleteCurrentChecklist)
  const inviteCollaboratorByEmail = useChecklistDetailStore((state) => state.inviteCollaboratorByEmail)
  const removeCollaboratorById   = useChecklistDetailStore((state) => state.removeCollaboratorById)
  const uploadItemAttachment     = useChecklistDetailStore((state) => state.uploadItemAttachment)
  const markComplete             = useChecklistDetailStore((state) => state.markComplete)

  const isOwner       = checklist?.user_id === user?.id
  const isCardAssignee = useMemo(() => {
    if (!user || !checklist) return false
    return collaborators.some((c) => c.user_id === user.id && c.role === 'assignee')
  }, [user, checklist, collaborators])

  const canEdit   = useMemo(() => {
    if (!user || !checklist) return false
    if (checklist.user_id === user.id) return true
    return collaborators.some((c) => c.user_id === user.id && c.role === 'editor')
  }, [user, checklist, collaborators])

  const canToggle  = canEdit || isCardAssignee
  const canComment = canEdit || isCardAssignee

  const currentIndex = id ? navigationIds.indexOf(id) : -1
  const previousId   = currentIndex > 0 ? navigationIds[currentIndex - 1] : null
  const nextId       = currentIndex >= 0 && currentIndex < navigationIds.length - 1
    ? navigationIds[currentIndex + 1] : null

  useEffect(() => {
    if (!id || !user) return
    void loadChecklist(id, user.id)
    subscribe(id)
    return () => { reset() }
  }, [id, user, loadChecklist, subscribe, reset])

  useEffect(() => {
    if (searchParams.get('share') === '1') {
      setShareOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('share')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  async function handleMarkComplete() {
    setCompleting(true)
    await markComplete()
    setCompleting(false)
  }

  const backLink  = isCrew ? '/my-cards' : '/dashboard'
  const backLabel = isCrew ? '← My Jobs' : '← Orders'

  if (!id) return <p className="muted-text">Order not found.</p>
  if (loading) return (
    <div className="detail-loading">
      <p className="muted-text">Loading order…</p>
    </div>
  )

  if (accessDenied) {
    return (
      <section className="access-denied">
        <h1>Access Denied</h1>
        <p>You do not have permission to view this order.</p>
        <Link to={backLink} className="btn btn-primary">{backLabel}</Link>
      </section>
    )
  }

  if (!checklist) return <p className="muted-text">Order not found.</p>

  return (
    <section className="checklist-detail-page">
      <div className="detail-header">
        <div className="detail-header-left">
          <Link to={backLink} className="detail-back-link">{backLabel}</Link>
          <div className="detail-title-block">
            <span className="detail-order-label">New Order:</span>
            <h1 className="detail-title">{checklist.title}</h1>
          </div>
          <span className={`status-pill status-pill-${checklist.status}`}>
            {STATUS_LABELS[checklist.status]}
          </span>
        </div>

        <div className="detail-header-actions">
          {/* Mobile objectives toggle */}
          <button
            type="button"
            className="btn btn-secondary btn-sm mobile-only"
            onClick={() => setSidebarOpen(true)}
          >
            📋 Tasks
          </button>

          {/* Crew: mark complete */}
          {isCardAssignee && checklist.status === 'active' && (
            <button
              type="button"
              className="btn btn-success"
              disabled={completing}
              onClick={() => void handleMarkComplete()}
            >
              {completing ? 'Submitting…' : '✓ Mark Complete'}
            </button>
          )}

          {/* Lead: share/settings */}
          {isOwner && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShareOpen(true)}>
              👥 Assign Crew
            </button>
          )}
          {canEdit && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSettingsOpen(true)}>
              📋 Details
            </button>
          )}

          {/* Prev / Next navigation */}
          <div className="detail-nav-arrows">
            {previousId
              ? <Link to={`/checklist/${previousId}`} className="btn btn-secondary btn-sm" title="Previous order">←</Link>
              : <button type="button" className="btn btn-secondary btn-sm" disabled>←</button>
            }
            {nextId
              ? <Link to={`/checklist/${nextId}`} className="btn btn-secondary btn-sm" title="Next order">→</Link>
              : <button type="button" className="btn btn-secondary btn-sm" disabled>→</button>
            }
          </div>
        </div>

      </div>

      {error && <Alert variant="error" message={error} />}

      <div className="detail-layout">
        <ObjectivesSidebar
          items={items}
          canEdit={canEdit}
          canToggle={canToggle}
          isAssignee={isCardAssignee}
          currentItemId={checklist.current_item_id ?? null}
          onToggle={(itemId, completed) => void toggleItem(itemId, completed)}
          onTaskChange={(itemId, task) => void updateItemTask(itemId, task)}
          onDelete={(itemId) => void removeItem(itemId)}
          onAdd={(task) => void addItem(task)}
          onReorder={(next) => void reorderLocalItems(next)}
          onSetCurrent={(itemId) => void markItemCurrent(itemId)}
          onUpload={(itemId, file) => {
            if (user) void uploadItemAttachment(itemId, user.id, file)
          }}
          uploadProgress={uploadProgress}
          mobileOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        <MessagesPanel
          title={checklist.title}
          items={items}
          comments={comments}
          authorNames={authorEmails}
          canComment={canComment}
          currentUserId={user?.id ?? ''}
          onAddComment={(itemId, text) => {
            if (user) void addComment(itemId, user.id, text)
          }}
        />
      </div>

      {canEdit && (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          checklist={checklist}
          onSave={saveSettings}
          onDelete={async () => {
            const deleted = await deleteCurrentChecklist()
            if (deleted) navigate(isCrew ? '/my-cards' : '/dashboard')
          }}
          onManageCollaborators={() => {
            setSettingsOpen(false)
            setShareOpen(true)
          }}
          error={error}
        />
      )}

      {isOwner && (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          collaborators={collaborators}
          onInvite={inviteCollaboratorByEmail}
          onRemove={removeCollaboratorById}
          error={error}
        />
      )}
    </section>
  )
}
