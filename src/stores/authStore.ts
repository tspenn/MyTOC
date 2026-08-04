import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import type { UserRole } from '../lib/types'

interface AuthState {
  user: User | null
  session: Session | null
  initialized: boolean
  userRole: UserRole | null
  displayName: string | null
  leadAvailable: boolean
  setAuth: (session: Session | null) => void
  setInitialized: (initialized: boolean) => void
  setUserRole: (role: UserRole | null) => void
  setDisplayName: (name: string | null) => void
  setLeadAvailable: (available: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  userRole: null,
  displayName: null,
  leadAvailable: true,
  setAuth: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setInitialized: (initialized) => set({ initialized }),
  setUserRole: (userRole) => set({ userRole }),
  setDisplayName: (displayName) => set({ displayName }),
  setLeadAvailable: (leadAvailable) => set({ leadAvailable }),
  clearAuth: () => set({ user: null, session: null, userRole: null, displayName: null, leadAvailable: true }),
}))
