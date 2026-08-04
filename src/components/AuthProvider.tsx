import { useEffect } from 'react'
import { fetchMyRole } from '../lib/checklistApi'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((state) => state.setAuth)
  const setInitialized = useAuthStore((state) => state.setInitialized)
  const setUserRole = useAuthStore((state) => state.setUserRole)
  const setDisplayName = useAuthStore((state) => state.setDisplayName)
  const setLeadAvailable = useAuthStore((state) => state.setLeadAvailable)

  useEffect(() => {
    let mounted = true

    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      if (!mounted) return
      setAuth(session)

      if (session) {
        const result = await fetchMyRole()
        if (mounted) {
          setUserRole(result?.role ?? null)
          setDisplayName(result?.displayName ?? null)
          setLeadAvailable(result?.isAvailable ?? true)
        }
      }

      setInitialized(true)
    }

    void initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAuth(session)
      if (session) {
        const result = await fetchMyRole()
        if (mounted) {
          setUserRole(result?.role ?? null)
          setDisplayName(result?.displayName ?? null)
          setLeadAvailable(result?.isAvailable ?? true)
        }
      } else {
        if (mounted) {
          setUserRole(null)
          setDisplayName(null)
          setLeadAvailable(true)
        }
      }
      setInitialized(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setAuth, setInitialized, setUserRole, setDisplayName, setLeadAvailable])

  return <>{children}</>
}
