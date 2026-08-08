import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Alert from '../components/Alert'
import FormField from '../components/FormField'
import InstallAppButton from '../components/InstallAppButton'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../lib/authErrors'
import { updateDisplayName, updateLeadAvailability } from '../lib/checklistApi'
import {
  currentPermission,
  hasActiveChkchkSubscription,
  isPushSupported,
  requestPermissionAndSubscribe,
  unsubscribePush,
} from '../lib/pushRegistration'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function ProfilePage() {
  const { user, displayName, userRole, isLead, leadAvailable } = useAuth()
  const clearAuth      = useAuthStore((state) => state.clearAuth)
  const setDisplayName = useAuthStore((state) => state.setDisplayName)
  const setLeadAvailable = useAuthStore((state) => state.setLeadAvailable)
  const navigate = useNavigate()

  const [nameValue,     setNameValue]     = useState(displayName ?? '')
  const [nameSaving,    setNameSaving]    = useState(false)
  const [nameSuccess,   setNameSuccess]   = useState<string | null>(null)
  const [nameError,     setNameError]     = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default')

  const [availabilityBusy, setAvailabilityBusy] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const perm = await currentPermission()
      const active = await hasActiveChkchkSubscription()
      if (!cancelled) {
        setPushPermission(perm)
        setPushEnabled(active && perm === 'granted')
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function handlePushToggle(next: boolean) {
    setPushError(null)
    setPushBusy(true)
    try {
      if (next) {
        if (!isPushSupported()) {
          setPushError('This browser does not support push notifications.')
          return
        }
        const result = await requestPermissionAndSubscribe()
        setPushPermission(await currentPermission())
        if (result === 'granted') {
          setPushEnabled(true)
        } else if (result === 'denied') {
          setPushEnabled(false)
          setPushError('Notification permission is blocked — open your browser or device settings and allow notifications for TOC.')
        } else {
          setPushEnabled(false)
          setPushError('Could not enable notifications. Try again or reinstall the app.')
        }
      } else {
        await unsubscribePush()
        setPushEnabled(false)
      }
    } finally {
      setPushBusy(false)
    }
  }

  async function handleAvailabilityToggle(next: boolean) {
    setAvailabilityError(null)
    setAvailabilityBusy(true)
    try {
      await updateLeadAvailability(next)
      setLeadAvailable(next)
    } catch (err) {
      setAvailabilityError(err instanceof Error ? err.message : 'Could not update availability.')
    } finally {
      setAvailabilityBusy(false)
    }
  }

  async function handleNameSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNameError(null)
    setNameSuccess(null)
    if (!nameValue.trim()) { setNameError('Name cannot be empty.'); return }
    setNameSaving(true)
    try {
      await updateDisplayName(nameValue.trim())
      setDisplayName(nameValue.trim())
      setNameSuccess('Name updated!')
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not save name.')
    }
    setNameSaving(false)
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!newPassword) {
      setPasswordError('New password is required.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setPasswordLoading(false)

    if (error) {
      setPasswordError(getAuthErrorMessage(error))
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setPasswordSuccess('Password updated successfully.')
  }

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeleteError(null)

    if (!user?.email) {
      setDeleteError('Unable to verify your account.')
      return
    }
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm account deletion.')
      return
    }

    const confirmed = window.confirm(
      'Delete your account permanently? This cannot be undone.',
    )
    if (!confirmed) return

    setDeleteLoading(true)

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    })

    if (reauthError) {
      setDeleteLoading(false)
      setDeleteError(getAuthErrorMessage(reauthError, 'Incorrect password.'))
      return
    }

    const { data, error: deleteErrorResult } = await supabase.functions.invoke('delete-account-chkchk', {
      body: { userId: user.id },
    })

    if (deleteErrorResult) {
      setDeleteLoading(false)
      setDeleteError(
        getAuthErrorMessage(
          deleteErrorResult,
          'Unable to delete account. Make sure the account deletion service is deployed.',
        ),
      )
      return
    }

    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      setDeleteLoading(false)
      setDeleteError(data.error)
      return
    }

    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <section className="page-card profile-page">
      <h1>Profile</h1>
      <p className="page-lead">Manage your account settings.</p>

      <div className="profile-section">
        <h2>Account</h2>
        <dl className="profile-details">
          <div>
            <dt>Email</dt>
            <dd>{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{userRole === 'assigner' ? 'Lead' : userRole === 'assignee' ? 'Team Member' : '—'}</dd>
          </div>
        </dl>
      </div>

      {isLead && (
        <div className="profile-section">
          <h2>Availability</h2>
          <p className="muted-text">
            Let your team members know when you are taking new directives. Your status shows in the header as{' '}
            <strong>Lead · Available</strong> or <strong>Lead · Unavailable</strong>.
          </p>
          {availabilityError && <Alert variant="error" message={availabilityError} />}
          <div className="profile-notify-row">
            <div>
              <p className="profile-notify-title">{leadAvailable ? 'Available' : 'Unavailable'}</p>
              <p className="muted-text small-text">
                {leadAvailable
                  ? 'You are open for new directives and assignments.'
                  : 'You are not taking new directives right now.'}
              </p>
            </div>
            <button
              type="button"
              className={`btn ${leadAvailable ? 'btn-primary' : 'btn-outline'}`}
              disabled={availabilityBusy}
              onClick={() => void handleAvailabilityToggle(!leadAvailable)}
            >
              {availabilityBusy ? 'Saving…' : leadAvailable ? 'Mark unavailable' : 'Mark available'}
            </button>
          </div>
        </div>
      )}

      <div className="profile-section">
        <h2>Notifications</h2>
        <p className="muted-text">
          Get a ping when you are assigned to a directive. Install TOC on each phone or computer you want
          pinged, then turn notifications on here. Step-by-step install help is in{' '}
          <Link to="/settings">Settings → How to use</Link>.
        </p>
        {pushError && <Alert variant="error" message={pushError} />}
        <div className="profile-notify-row">
          <div>
            <p className="profile-notify-title">{pushEnabled ? 'Notifications on' : 'Notifications off'}</p>
            <p className="muted-text small-text">
              {userRole === 'assignee'
                ? 'Team Members: turn this on so your Lead can reach you when a directive is assigned.'
                : 'Optional on Lead accounts — turn on if you also receive assignments.'}
            </p>
          </div>
          <div className="profile-notify-actions">
            <InstallAppButton size="sm" />
            <button
              type="button"
              className={`btn ${pushEnabled ? 'btn-primary' : 'btn-outline'}`}
              disabled={pushBusy || pushPermission === 'unsupported'}
              onClick={() => void handlePushToggle(!pushEnabled)}
            >
              {pushBusy ? 'Working…' : pushEnabled ? 'Turn off' : 'Turn on'}
            </button>
          </div>
        </div>
        {pushPermission === 'denied' && (
          <p className="muted-text small-text" style={{ color: '#f87171', marginTop: '0.75rem' }}>
            Notification permission is blocked — allow notifications for this site in your browser or device settings.
          </p>
        )}
      </div>

      <div className="profile-section">
        <h2>Display name</h2>
        <p className="muted-text">This name appears on messages and directives.</p>
        <form className="profile-form" onSubmit={handleNameSave}>
          {nameError   && <Alert variant="error"   message={nameError}   />}
          {nameSuccess && <Alert variant="success" message={nameSuccess} />}
          <FormField id="display-name" label="Your name" value={nameValue} onChange={setNameValue} autoComplete="name" />
          <button type="submit" className="btn btn-primary" disabled={nameSaving}>
            {nameSaving ? 'Saving…' : 'Save name'}
          </button>
        </form>
      </div>

      <div className="profile-section">
        <h2>Change password</h2>
        <form className="profile-form" onSubmit={handlePasswordChange}>
          {passwordError && <Alert variant="error" message={passwordError} />}
          {passwordSuccess && <Alert variant="success" message={passwordSuccess} />}

          <FormField
            id="new-password"
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
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

          <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
            {passwordLoading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>

      <div className="profile-section profile-danger">
        <h2>Delete account</h2>
        <p>Permanently remove your account and sign out everywhere.</p>
        <form className="profile-form" onSubmit={handleDeleteAccount}>
          {deleteError && <Alert variant="error" message={deleteError} />}

          <FormField
            id="delete-password"
            label="Confirm with your password"
            type="password"
            value={deletePassword}
            onChange={setDeletePassword}
            autoComplete="current-password"
          />

          <button type="submit" className="btn btn-danger" disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete account'}
          </button>
        </form>
      </div>
    </section>
  )
}
