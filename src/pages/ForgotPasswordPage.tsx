import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { supabase } from '../lib/supabase'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/reset-password` },
    )

    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setSent(true)
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll send a reset link to your email."
      footerText="Remembered it?"
      footerLinkText="Back to sign in"
      footerLinkTo="/login"
    >
      {sent ? (
        <div className="reset-sent">
          <span className="reset-sent-icon">📬</span>
          <p>
            If <strong>{email}</strong> has an account, a reset link is on its way.
            Check your inbox (and spam folder).
          </p>
          <Link to="/login" className="btn btn-primary btn-full">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <Alert variant="error" message={error} />}
          <FormField
            id="reset-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
