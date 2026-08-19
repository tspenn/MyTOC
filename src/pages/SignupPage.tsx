import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage, validateSignupForm } from '../lib/authErrors'
import {
  acceptCoLeadInvite,
  ensureLeadCode,
  ensureTeamForLead,
  fetchMyRole,
  setMyRole,
} from '../lib/checklistApi'
import { clearPendingCoLeadInvite, clearPendingLeadSignup, savePendingCoLeadInvite, savePendingLeadSignup } from '../lib/leadBootstrap'
import { SIGNUP_APP_ID } from '../lib/signupApp'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const coLeadToken = searchParams.get('colead')
  const invitedEmail = searchParams.get('email')
  const { isAuthenticated, initialized } = useAuth()
  const setUserRole = useAuthStore((state) => state.setUserRole)
  const setDisplayName = useAuthStore((state) => state.setDisplayName)
  const setTeamMeta = useAuthStore((state) => state.setTeamMeta)

  const [email, setEmail] = useState(invitedEmail ?? '')
  const [displayName, setDisplayNameVal] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (coLeadToken) savePendingCoLeadInvite(coLeadToken)
  }, [coLeadToken])

  if (!initialized) {
    return (
      <div className="loading-screen">
        <p>Loading…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function finishLeadSetup(name: string) {
    await setMyRole('assigner', { displayName: name })
    if (coLeadToken) {
      await acceptCoLeadInvite(coLeadToken)
    } else {
      await ensureTeamForLead()
      await ensureLeadCode()
    }
    clearPendingLeadSignup()
    clearPendingCoLeadInvite()
    const teamRole = await fetchMyRole()
    setUserRole('assigner')
    setDisplayName(teamRole?.displayName ?? name)
    setTeamMeta(teamRole?.teamId ?? null, teamRole?.isPrimaryLead ?? false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!displayName.trim()) {
      setError('Please enter your name.')
      return
    }

    const validationError = validateSignupForm(email, password, confirmPassword)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { signup_app: SIGNUP_APP_ID },
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(getAuthErrorMessage(signUpError))
      return
    }

    if ((data?.user?.identities?.length ?? 1) === 0) {
      setLoading(false)
      setError('__existing__')
      return
    }

    if (data.session) {
      try {
        await finishLeadSetup(displayName.trim())
      } catch (err) {
        setLoading(false)
        setError(err instanceof Error ? err.message : 'Could not finish Lead setup')
        return
      }
      setLoading(false)
      navigate('/dashboard', { replace: true })
      return
    }

    // Email confirmation required — remember Lead setup for first sign-in.
    savePendingLeadSignup(displayName.trim())
    setLoading(false)
    setSuccess('Account created! Check your email to confirm, then sign in as Lead.')
  }

  return (
    <AuthLayout
      title={coLeadToken ? 'Join as co-Lead' : 'Join MyTOC'}
      subtitle={
        coLeadToken
          ? 'Create your Lead account to share the same board.'
          : 'Lead accounts only. Team members join with a Lead ID invite — not here.'
      }
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo={coLeadToken ? `/login?colead=${encodeURIComponent(coLeadToken)}` : '/login'}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error === '__existing__' ? (
          <div className="alert alert-existing">
            That email already has an account, so the password you just typed was not saved.{' '}
            <a href="/login" className="alert-existing-link">Sign in</a>
            {' '}with your original password, or{' '}
            <a href="/forgot-password" className="alert-existing-link">reset it</a>.
          </div>
        ) : (
          error && <Alert variant="error" message={error} />
        )}
        {success && <Alert variant="success" message={success} />}

        <FormField
          id="signup-name"
          label="Your name"
          type="text"
          value={displayName}
          onChange={setDisplayNameVal}
          autoComplete="name"
        />
        <FormField
          id="signup-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <FormField
          id="signup-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <FormField
          id="signup-confirm-password"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />

        <p className="auth-helper muted-text">
          Team member? Use the invite link or Lead ID from your Lead —{' '}
          <Link to="/team-signup">join your team</Link>
          {' '}or{' '}
          <Link to="/login?mode=team">sign in</Link>.
        </p>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Lead account'}
        </button>

        <p className="auth-privacy-note">
          By signing up you agree to our{' '}
          <a href="https://skylandreach.com/privacy-policy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          . 14-day free trial, no credit card required.
        </p>
      </form>
    </AuthLayout>
  )
}
