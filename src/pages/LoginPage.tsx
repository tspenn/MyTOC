import { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage, validateLoginForm } from '../lib/authErrors'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, initialized } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard'

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your command center."
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkTo="/signup"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
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
        <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
