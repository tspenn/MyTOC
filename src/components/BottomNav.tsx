import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function BottomNav() {
  const { isAuthenticated, isCrew } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return null

  const homeHref = isCrew ? '/my-cards' : '/dashboard'

  function isActive(paths: string[]) {
    return paths.some((p) => location.pathname.startsWith(p))
  }

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <Link
        to={homeHref}
        className={`bottom-nav-tab ${location.pathname === homeHref || location.pathname === '/' ? 'bottom-nav-active' : ''}`}
      >
        <span className="bottom-nav-icon" aria-hidden="true">⌂</span>
        <span>Home</span>
      </Link>

      <Link
        to={isCrew ? '/my-cards' : '/dashboard'}
        className={`bottom-nav-tab ${isActive(['/my-cards', '/dashboard']) && !isActive(['/checklist']) ? 'bottom-nav-active' : ''}`}
      >
        <span className="bottom-nav-icon">📋</span>
        <span>{isCrew ? 'My Directives' : 'Directives'}</span>
      </Link>

      <Link
        to={isCrew ? '/my-cards?done=1' : '/dashboard?tab=archived'}
        className={`bottom-nav-tab ${isActive(['/checklist']) ? 'bottom-nav-active' : ''}`}
      >
        <span className="bottom-nav-icon">✓</span>
        <span>Confirmed</span>
      </Link>
    </nav>
  )
}
