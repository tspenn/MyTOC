export function getAuthErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error || typeof error !== 'object') return fallback

  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : fallback

  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }
  if (normalized.includes('user already registered')) {
    return 'An account with this email already exists.'
  }
  if (normalized.includes('password should be at least')) {
    return 'Password must be at least 6 characters.'
  }
  if (normalized.includes('unable to validate email address')) {
    return 'Please enter a valid email address.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }
  if (normalized.includes('same as the old password')) {
    return 'New password must be different from your current password.'
  }

  return message
}

export function validateSignupForm(
  email: string,
  password: string,
  confirmPassword: string,
): string | null {
  if (!email.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.'
  if (!password) return 'Password is required.'
  if (password.length < 6) return 'Password must be at least 6 characters.'
  if (password !== confirmPassword) return 'Passwords do not match.'
  return null
}

export function validateLoginForm(email: string, password: string): string | null {
  if (!email.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.'
  if (!password) return 'Password is required.'
  return null
}
