import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) { setError(updateError.message); return }

    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter your new password below."
      footerText="Changed your mind?"
      footerLinkText="Back to sign in"
      footerLinkTo="/login"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <Alert variant="error" message={error} />}
        <FormField
          id="new-password"
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <FormField
          id="confirm-new-password"
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </AuthLayout>
  )
}
