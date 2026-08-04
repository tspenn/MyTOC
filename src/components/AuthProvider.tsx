import { useEffect } from 'react'
import { syncAuthRoleFromServer } from '../lib/leadBootstrap'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((state) => state.setAuth)
  const setInitialized = useAuthStore((state) => state.setInitialized)
  const setUserRole = useAuthStore((state) => state.setUserRole)
  const setDisplayName = useAuthStore((state) => state.setDisplayName)
  const setLeadAvailable = useAuthStore((state) => state.setLeadAvailable)
  const setTeamMeta = useAuthStore((state) => state.setTeamMeta)

  useEffect(() => {
    let mounted = true

    async function applyRole() {
      const result = await syncAuthRoleFromServer()
      if (!mounted) return
      setUserRole(result?.role ?? null)
      setDisplayName(result?.displayName ?? null)
      setLeadAvailable(result?.isAvailable ?? true)
      setTeamMeta(result?.teamId ?? null, result?.isPrimaryLead ?? false)
    }

    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      if (!mounted) return
      setAuth(session)

      if (session) {
        await applyRole()
      }

      setInitialized(true)
    }

    void initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAuth(session)
      if (session) {
        await applyRole()
      } else {
        if (mounted) {
          setUserRole(null)
          setDisplayName(null)
          setLeadAvailable(true)
          setTeamMeta(null, false)
        }
      }
      setInitialized(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setAuth, setInitialized, setUserRole, setDisplayName, setLeadAvailable, setTeamMeta])

  return <>{children}</>
}
