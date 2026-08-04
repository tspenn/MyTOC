import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const session = useAuthStore((state) => state.session)
  const initialized = useAuthStore((state) => state.initialized)
  const userRole = useAuthStore((state) => state.userRole)
  const displayName = useAuthStore((state) => state.displayName)
  const leadAvailable = useAuthStore((state) => state.leadAvailable)
  const isPrimaryLead = useAuthStore((state) => state.isPrimaryLead)
  const teamId = useAuthStore((state) => state.teamId)

  return {
    user,
    session,
    initialized,
    userRole,
    displayName,
    leadAvailable,
    teamId,
    isPrimaryLead,
    isAuthenticated: !!session,
    isLead: userRole === 'assigner',
    isTeamMember: userRole === 'assignee',
    isCrew: userRole === 'assignee', // legacy alias
    isAssigner: userRole === 'assigner', // legacy alias
    isAssignee: userRole === 'assignee', // legacy alias
  }
}
