import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../hooks/useAuth'
import { acceptCoLeadInvite, fetchMyRole, validateCoLeadInvite } from '../lib/checklistApi'
import { clearPendingCoLeadInvite, savePendingCoLeadInvite } from '../lib/leadBootstrap'
import { useAuthStore } from '../stores/authStore'

export default function JoinLeadPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { isAuthenticated, initialized, isLead } = useAuth()
  const setUserRole = useAuthStore((state) => state.setUserRole)
  const setDisplayName = useAuthStore((state) => state.setDisplayName)
  const setTeamMeta = useAuthStore((state) => state.setTeamMeta)

  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)

  useEffect(() => {
    if (token) savePendingCoLeadInvite(token)
    if (!token) {
      setValidating(false)
      setError('Invite link is missing or invalid.')
      return
    }
    void validateCoLeadInvite(token).then((result) => {
      if (result.valid && result.email) setInviteEmail(result.email)
      else setError('This invite link is invalid or has already been used.')
      setValidating(false)
    })
  }, [token])

  if (!initialized || validating) {
    return (
      <div className="loading-screen">
        <p>Loading…</p>
      </div>
    )
  }

  if (isAuthenticated && isLead) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleAccept() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await acceptCoLeadInvite(token)
      clearPendingCoLeadInvite()
      const role = await fetchMyRole()
      setUserRole('assigner')
      setDisplayName(role?.displayName ?? null)
      setTeamMeta(role?.teamId ?? null, role?.isPrimaryLead ?? false)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join Lead team')
    }
    setLoading(false)
  }

  if (!isAuthenticated) {
    return (
      <AuthLayout
        title="Join as co-Lead"
        subtitle={
          inviteEmail
            ? `You've been invited to share the Lead board for ${inviteEmail}.`
            : 'Sign in or create an account, then accept the invite.'
        }
        footerText="Already on the team?"
        footerLinkText="Go to dashboard"
        footerLinkTo="/dashboard"
      >
        {error && <Alert variant="error" message={error} />}

        <div className="join-lead-actions">
          <p className="muted-text">
            Sign up or log in with the email your primary Lead invited, then return here to accept.
          </p>
          <Link
            to={`/signup?colead=${encodeURIComponent(token)}${inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : ''}`}
            className="btn btn-primary btn-full"
          >
            Create Lead account
          </Link>
          <Link
            to={`/login?colead=${encodeURIComponent(token)}`}
            className="btn btn-secondary btn-full"
          >
            Sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Join Lead team"
      subtitle="Accept the invite to share the same board, directives, and lead notes."
      footerText="Not you?"
      footerLinkText="Back to home"
      footerLinkTo="/home"
    >
      {error && <Alert variant="error" message={error} />}

      <button
        type="button"
        className="btn btn-primary btn-full"
        disabled={loading || !token}
        onClick={() => void handleAccept()}
      >
        {loading ? 'Joining…' : 'Accept & open shared board'}
      </button>
    </AuthLayout>
  )
}
