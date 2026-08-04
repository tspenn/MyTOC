import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage, validateSignupForm } from '../lib/authErrors'
import { setMyRole } from '../lib/checklistApi'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { UserRole } from '../lib/types'

export default function SignupPage() {
  const navigate = useNavigate()
  const { isAuthenticated, initialized } = useAuth()
  const setUserRole    = useAuthStore((state) => state.setUserRole)
  const setDisplayName = useAuthStore((state) => state.setDisplayName)

  const [email,           setEmail]           = useState('')
  const [displayName,     setDisplayNameVal]  = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role,            setRole]            = useState<UserRole>('assigner')
  const [error,           setError]           = useState<string | null>(null)
  const [success,         setSuccess]         = useState<string | null>(null)
  const [loading,         setLoading]         = useState(false)

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
    })

    if (signUpError) {
      setLoading(false)
      setError(getAuthErrorMessage(signUpError))
      return
    }

    // Supabase returns identities === [] when the email already exists in the
    // shared project — no email is sent and signUp() still returns "success".
    if ((data?.user?.identities?.length ?? 1) === 0) {
      setLoading(false)
      setError('__existing__')
      return
    }

    if (data.session) {
      try {
        await setMyRole(role, {
          displayName: displayName.trim(),
        })
        setUserRole(role)
        setDisplayName(displayName.trim())
      } catch {
        // Non-fatal — role can be set later
      }
      setLoading(false)
      navigate(role === 'assignee' ? '/my-cards' : '/dashboard', { replace: true })
      return
    }

    setLoading(false)
    setSuccess('Account created! Check your email to confirm, then sign in.')
  }

  return (
    <AuthLayout
      title="Join MyTOC"
      subtitle="Issue directives. Track ownership. Confirm done."
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error === '__existing__' ? (
          <div className="alert alert-existing">
            That email already has an account.{' '}
            <a href="/login" className="alert-existing-link">Log in instead →</a>
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

        <fieldset className="role-selector">
          <legend>I am a…</legend>
          <label className={`role-option ${role === 'assigner' ? 'role-option-selected' : ''}`}>
            <input
              type="radio"
              name="role"
              value="assigner"
              checked={role === 'assigner'}
              onChange={() => setRole('assigner')}
            />
            <div>
              <strong>Lead (COO / Executive)</strong>
              <span>Create directives, assign team members, confirm done</span>
            </div>
          </label>
          <label className={`role-option ${role === 'assignee' ? 'role-option-selected' : ''}`}>
            <input
              type="radio"
              name="role"
              value="assignee"
              checked={role === 'assignee'}
              onChange={() => setRole('assignee')}
            />
            <div>
              <strong>Team Member</strong>
              <span>Receive directives via notifications, work items, mark done</span>
            </div>
          </label>
        </fieldset>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
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
