import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTrialStatus, type TrialStatus } from '../lib/checklistApi'
import { useAuth } from '../hooks/useAuth'

export default function TrialBanner() {
  const { isAuthenticated } = useAuth()
  const [trial, setTrial] = useState<TrialStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    void fetchTrialStatus().then(setTrial)
  }, [isAuthenticated])

  if (!trial || dismissed) return null

  // Only show the banner when ≤ 7 days remain, or already expired
  if (!trial.is_expired && trial.days_remaining > 7) return null

  if (trial.is_expired) {
    return (
      <div className="trial-banner trial-banner-expired" role="alert">
        <span>⏰ Your 14-day free trial has ended.</span>
        <Link to="/home#pricing" className="trial-banner-cta">Choose a plan →</Link>
      </div>
    )
  }

  return (
    <div className="trial-banner trial-banner-warning" role="status">
      <span>
        ⏳ {trial.days_remaining} day{trial.days_remaining !== 1 ? 's' : ''} left in your free trial.
      </span>
      <Link to="/home#pricing" className="trial-banner-cta">Upgrade →</Link>
      <button type="button" className="trial-banner-dismiss" aria-label="Dismiss" onClick={() => setDismissed(true)}>✕</button>
    </div>
  )
}
