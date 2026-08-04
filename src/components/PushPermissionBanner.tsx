import { useState } from 'react'
import { useWebPush } from '../hooks/useWebPush'
import { useAuth } from '../hooks/useAuth'

export default function PushPermissionBanner() {
  const { isAuthenticated, isCrew } = useAuth()
  const { supported, permission, saving, requestPermission } = useWebPush()
  const [dismissed, setDismissed] = useState(false)

  // Only show to Crew members who haven't decided yet
  if (!isAuthenticated || !isCrew || !supported || permission !== 'default' || dismissed) return null

  return (
    <div className="push-banner" role="status">
      <span className="push-banner-icon">🔔</span>
      <div className="push-banner-text">
        <strong>Get notified instantly</strong>
        <span>Allow notifications so you'll know the moment a new order is assigned to you.</span>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={saving}
        onClick={() => requestPermission()}
      >
        {saving ? 'Enabling…' : 'Enable notifications'}
      </button>
      <button
        type="button"
        className="push-banner-dismiss"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
    </div>
  )
}
