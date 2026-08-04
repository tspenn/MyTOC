import { create } from 'zustand'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  confirmCard,
  createChecklist,
  deleteChecklist,
  fetchOwnedChecklists,
  rejectCard,
  AccessDeniedError,
} from '../lib/checklistApi'
import type { CardStatus, DashboardChecklist } from '../lib/types'

interface DashboardState {
  checklists: DashboardChecklist[]
  activeTab: CardStatus
  loading: boolean
  error: string | null
  channel: RealtimeChannel | null
  loadChecklists: (userId: string) => Promise<void>
  setActiveTab: (tab: CardStatus) => void
  subscribe: (userId: string) => void
  unsubscribe: () => void
  addChecklist: (userId: string, title: string, description: string) => Promise<string | null>
  removeChecklist: (id: string) => Promise<void>
  confirmChecklist: (id: string, userId: string) => Promise<void>
  rejectChecklist: (id: string, userId: string) => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  checklists: [],
  activeTab: 'active',
  loading: false,
  error: null,
  channel: null,

  loadChecklists: async (userId) => {
    set({ loading: true, error: null })
    try {
      const checklists = await fetchOwnedChecklists(userId)
      set({ checklists, loading: false })
    } catch (error) {
      const message =
        error instanceof AccessDeniedError
          ? 'Access Denied'
          : error instanceof Error
            ? error.message
            : 'Failed to load checklists'
      set({ error: message, loading: false })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  subscribe: (userId) => {
    get().unsubscribe()

    const channel = supabase
      .channel(`dashboard-checklists-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chkchk_checklists',
          filter: `user_id=eq.${userId}`,
        },
        () => { void get().loadChecklists(userId) },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chkchk_items' },
        () => { void get().loadChecklists(userId) },
      )
      .subscribe()

    set({ channel })
  },

  unsubscribe: () => {
    const { channel } = get()
    if (channel) {
      void supabase.removeChannel(channel)
      set({ channel: null })
    }
  },

  addChecklist: async (userId, title, description) => {
    set({ error: null })
    try {
      const checklist = await createChecklist(userId, title, description)
      await get().loadChecklists(userId)
      return checklist.id
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create checklist' })
      return null
    }
  },

  removeChecklist: async (id) => {
    set({ error: null })
    try {
      await deleteChecklist(id)
      set((state) => ({
        checklists: state.checklists.filter((c) => c.id !== id),
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete checklist' })
    }
  },

  confirmChecklist: async (id, userId) => {
    set({ error: null })
    try {
      await confirmCard(id)
      await get().loadChecklists(userId)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to confirm completion' })
    }
  },

  rejectChecklist: async (id, userId) => {
    set({ error: null })
    try {
      await rejectCard(id)
      await get().loadChecklists(userId)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to reject completion' })
    }
  },
}))
