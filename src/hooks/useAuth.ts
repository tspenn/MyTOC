import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const session = useAuthStore((state) => state.session)
  const initialized = useAuthStore((state) => state.initialized)
  const userRole = useAuthStore((state) => state.userRole)
  const displayName = useAuthStore((state) => state.displayName)
  const leadAvailable = useAuthStore((state) => state.leadAvailable)

  return {
    user,
    session,
    initialized,
    userRole,
    displayName,
    leadAvailable,
    isAuthenticated: !!session,
    isLead: userRole === 'assigner',
    isCrew: userRole === 'assignee',
    // legacy aliases kept for backward compat while migrating
    isAssigner: userRole === 'assigner',
    isAssignee: userRole === 'assignee',
  }
}
