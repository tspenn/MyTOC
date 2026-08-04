import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage, validateLoginForm } from '../lib/authErrors'
import { savePendingCoLeadInvite } from '../lib/leadBootstrap'
import { teamLoginEmail } from '../lib/teamAuth'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const teamMode = searchParams.get('mode') === 'team'
  const coLeadToken = searchParams.get('colead')
  const { isAuthenticated, initialized } = useAuth()
  const [email, setEmail] = useState('')
  const [leadCode, setLeadCode] = useState('')
  const [workerNumber, setWorkerNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  useEffect(() => {
    if (coLeadToken) savePendingCoLeadInvite(coLeadToken)
  }, [coLeadToken])

  if (!initialized) {
    return (
      <div className="loading-screen">
        <p>Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const validationError = validateLoginForm(email, password)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(getAuthErrorMessage(signInError))
      return
    }

    navigate(coLeadToken ? `/join-lead?token=${encodeURIComponent(coLeadToken)}` : redirectTo, { replace: true })
  }

  async function handleTeamLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!leadCode.trim() || !workerNumber.trim()) {
      setError('Lead ID and worker number are required.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }

    setLoading(true)

    const loginEmail = teamLoginEmail(leadCode, workerNumber)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(getAuthErrorMessage(signInError))
      return
    }

    navigate('/my-cards', { replace: true })
  }

  if (teamMode) {
    return (
      <AuthLayout
        title="Team member sign in"
        subtitle="MyTOC team mode — use the Lead ID and worker number your Lead gave you."
        footerText="Lead or co-lead with email?"
        footerLinkText="Email sign in"
        footerLinkTo="/login"
      >
        <form className="auth-form" onSubmit={handleTeamLogin}>
          {error && <Alert variant="error" message={error} />}

          <FormField
            id="login-lead-id"
            label="Lead ID"
            value={leadCode}
            onChange={setLeadCode}
            autoComplete="off"
          />
          <FormField
            id="login-worker-number"
            label="Your worker #"
            value={workerNumber}
            onChange={setWorkerNumber}
            autoComplete="off"
          />
          <FormField
            id="login-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-helper">
          <Link to="/team-signup">First time? Join with your invite link</Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your MyTOC command center."
      footerText="Don't have an account?"
      footerLinkText="Sign up as Lead"
      footerLinkTo="/signup"
    >
      <form className="auth-form" onSubmit={handleEmailLogin}>
        {error && <Alert variant="error" message={error} />}

        <FormField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <FormField
          id="login-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="auth-helper">
        <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
      </p>
      <p className="auth-helper">
        <Link to="/login?mode=team">Team member? Sign in with Lead ID</Link>
      </p>
      <p className="auth-helper">
        <Link to="/signup">Create a Lead account</Link>
      </p>
    </AuthLayout>
  )
}
