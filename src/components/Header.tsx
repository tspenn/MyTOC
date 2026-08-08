import { Link, useNavigate } from 'react-router-dom'
import InstallAppButton from './InstallAppButton'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../stores/authStore'

export default function Header() {
  const { isAuthenticated, isLead, isTeamMember, displayName, user, leadAvailable } = useAuth()
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login')
  }

  const homeLink = isTeamMember ? '/my-cards' : '/dashboard'
  const nameDisplay = displayName || user?.email?.split('@')[0] || ''

  return (
    <header className="app-header">

      {/* Left — role badge (or empty slot when logged out) */}
      <div className="app-header-left">
        {isAuthenticated && isLead && (
          <span className={`app-logo-role ${leadAvailable ? 'app-logo-role-available' : 'app-logo-role-unavailable'}`}>
            Lead · {leadAvailable ? 'Available' : 'Unavailable'}
          </span>
        )}
        {isAuthenticated && isTeamMember && (
          <span className="app-logo-role">Team Member</span>
        )}
      </div>

      {/* Center — TOC logo */}
      <Link to={isAuthenticated ? homeLink : '/home'} className="app-logo" title="Tactical Operations Center">
        <img src="/Logo.jpg" alt="TOC" className="app-logo-img" />
      </Link>

      {/* Right — nav */}
      <nav className="app-nav app-header-right">
        {isAuthenticated ? (
          <>
            <InstallAppButton size="sm" className="app-nav-install" />
            <Link to="/settings" className="app-nav-link">Settings</Link>
            {nameDisplay && (
              <Link to="/profile" className="app-nav-user" title={nameDisplay}>
                <span className="app-nav-avatar">{nameDisplay.charAt(0).toUpperCase()}</span>
                <span className="app-nav-name">{nameDisplay}</span>
              </Link>
            )}
            <button type="button" className="btn btn-secondary btn-sm app-nav-logout" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <InstallAppButton size="sm" className="app-nav-install" />
            <Link to="/home#pricing" className="app-nav-pricing">Pricing</Link>
            <Link to="/login">Log in</Link>
            <Link to="/signup" className="btn btn-gold btn-sm">Sign up free</Link>
          </>
        )}
      </nav>

    </header>
  )
}
