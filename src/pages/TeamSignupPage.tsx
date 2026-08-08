import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { teamSignup, validateTeamSlot } from '../lib/checklistApi'
import { teamLoginEmail } from '../lib/teamAuth'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function TeamSignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, initialized } = useAuth()
  const setUserRole = useAuthStore((state) => state.setUserRole)
  const setDisplayName = useAuthStore((state) => state.setDisplayName)

  const [leadCode, setLeadCode] = useState(searchParams.get('lead') ?? '')
  const [workerNumber, setWorkerNumber] = useState(searchParams.get('worker') ?? '')
  const [memberName, setMemberName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const lead = searchParams.get('lead')
    const worker = searchParams.get('worker')
    if (!lead || !worker) return
    void validateTeamSlot(lead, worker).then((result) => {
      if (result.valid && result.display_name) setMemberName(result.display_name)
    })
  }, [searchParams])

  if (!initialized) {
    return (
      <div className="loading-screen">
        <p>Loading…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/my-cards" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!leadCode.trim() || !workerNumber.trim()) {
      setError('Lead ID and worker number are required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const result = await teamSignup(leadCode, workerNumber, password)
      const email = result.email || teamLoginEmail(leadCode, workerNumber)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      setUserRole('assignee')
      setDisplayName(result.display_name ?? memberName)
      navigate('/my-cards', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account')
    }
    setLoading(false)
  }

  return (
    <AuthLayout
      title="Join TOC"
      subtitle="Use the Lead ID and worker number your Lead texted you."
      footerText="Already signed up?"
      footerLinkText="Sign in as team member"
      footerLinkTo="/login?mode=team"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <Alert variant="error" message={error} />}

        {memberName && (
          <p className="team-signup-welcome">
            Hi <strong>{memberName}</strong> — set a password to join.
          </p>
        )}

        <FormField
          id="team-lead-id"
          label="Lead ID"
          value={leadCode}
          onChange={setLeadCode}
          autoComplete="off"
        />
        <FormField
          id="team-worker-number"
          label="Your worker #"
          value={workerNumber}
          onChange={setWorkerNumber}
          autoComplete="off"
        />
        <FormField
          id="team-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <FormField
          id="team-confirm-password"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />

        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Joining…' : 'Join team'}
        </button>
      </form>

      <p className="auth-helper muted-text">
        Lead or manager?{' '}
        <Link to="/signup">Sign up as Lead</Link>
        {' '}·{' '}
        <Link to="/login">Lead sign in</Link>
      </p>
    </AuthLayout>
  )
}
