import { create } from 'zustand'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  AccessDeniedError,
  addLeadNote as createLeadNoteApi,
  createComment,
  createItem,
  deleteChecklist,
  deleteItem,
  fetchAccessibleChecklistIds,
  fetchChecklistById,
  fetchCollaborators,
  fetchCommentsForItems,
  fetchDisplayNames,
  fetchItems,
  fetchLeadNotes,
  inviteCollaborator,
  inviteRosterMember,
  markCardComplete,
  notifyAssignee,
  removeCollaborator,
  reorderItems,
  setCurrentItem,
  updateChecklist,
  updateItem,
  uploadAttachment,
} from '../lib/checklistApi'
import type {
  Checklist,
  ChecklistComment,
  ChecklistItem,
  CollaboratorProfile,
  CollaboratorRole,
  LeadNote,
} from '../lib/types'

interface ChecklistDetailState {
  checklist: Checklist | null
  items: ChecklistItem[]
  comments: ChecklistComment[]
  leadNotes: LeadNote[]
  collaborators: CollaboratorProfile[]
  navigationIds: string[]
  authorEmails: Record<string, string>   // kept for compat, populated with display names
  leadNoteAuthors: Record<string, string>
  loading: boolean
  accessDenied: boolean
  error: string | null
  uploadProgress: number | null
  channels: RealtimeChannel[]
  reset: () => void
  loadChecklist: (id: string, userId: string) => Promise<void>
  subscribe: (checklistId: string) => void
  unsubscribe: () => void
  toggleItem: (itemId: string, completed: boolean) => Promise<void>
  updateItemTask: (itemId: string, task: string) => Promise<void>
  addItem: (task: string) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  reorderLocalItems: (items: ChecklistItem[]) => Promise<void>
  /** Crew opens a task card → marks it Current for Lead. */
  markItemCurrent: (itemId: string) => Promise<void>
  addComment: (itemId: string, userId: string, text: string) => Promise<void>
  addLeadNote: (text: string) => Promise<void>
  saveSettings: (title: string, description: string) => Promise<void>
  deleteCurrentChecklist: () => Promise<boolean>
  inviteCollaboratorByEmail: (email: string, role: CollaboratorRole) => Promise<void>
  inviteRosterMemberBySlot: (slotId: string, role: CollaboratorRole) => Promise<void>
  removeCollaboratorById: (id: string) => Promise<void>
  uploadItemAttachment: (itemId: string, userId: string, file: File) => Promise<void>
  markComplete: () => Promise<void>
}

export const useChecklistDetailStore = create<ChecklistDetailState>((set, get) => ({
  checklist: null,
  items: [],
  comments: [],
  leadNotes: [],
  collaborators: [],
  navigationIds: [],
  authorEmails: {},
  leadNoteAuthors: {},
  loading: false,
  accessDenied: false,
  error: null,
  uploadProgress: null,
  channels: [],

  reset: () => {
    get().unsubscribe()
    set({
      checklist: null,
      items: [],
      comments: [],
      leadNotes: [],
      collaborators: [],
      navigationIds: [],
      authorEmails: {},
      leadNoteAuthors: {},
      loading: false,
      accessDenied: false,
      error: null,
      uploadProgress: null,
    })
  },

  loadChecklist: async (id, userId) => {
    set({ loading: true, error: null, accessDenied: false })
    try {
      const [checklist, navigationIds] = await Promise.all([
        fetchChecklistById(id),
        fetchAccessibleChecklistIds(userId),
      ])

      if (!checklist) {
        set({ accessDenied: true, loading: false, checklist: null })
        return
      }

      const [items, collaborators] = await Promise.all([
        fetchItems(id),
        fetchCollaborators(id),
      ])

      const comments = await fetchCommentsForItems(items.map((item) => item.id))
      const leadNotes = await fetchLeadNotes(id)
      const authorEmails = await fetchDisplayNames([
        ...new Set(comments.map((comment) => comment.user_id)),
      ])
      const leadNoteAuthors = await fetchDisplayNames([
        ...new Set(leadNotes.map((note) => note.user_id)),
      ])

      set({
        checklist,
        items,
        comments,
        leadNotes,
        collaborators,
        navigationIds,
        authorEmails,
        leadNoteAuthors,
        loading: false,
      })
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        set({ accessDenied: true, loading: false })
        return
      }
      set({
        error: error instanceof Error ? error.message : 'Failed to load checklist',
        loading: false,
      })
    }
  },

  subscribe: (checklistId) => {
    get().unsubscribe()

    const itemsChannel = supabase
      .channel(`checklist-items-${checklistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chkchk_items',
          filter: `checklist_id=eq.${checklistId}`,
        },
        async () => {
          const items = await fetchItems(checklistId)
          const comments = await fetchCommentsForItems(items.map((item) => item.id))
          set({ items, comments })
        },
      )
      .subscribe()

    const commentsChannel = supabase
      .channel(`checklist-comments-${checklistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chkchk_comments',
        },
        async () => {
          const { items } = get()
          const comments = await fetchCommentsForItems(items.map((item) => item.id))
          const authorEmails = await fetchDisplayNames([
            ...new Set(comments.map((comment) => comment.user_id)),
          ])
          set({ comments, authorEmails })
        },
      )
      .subscribe()

    const checklistChannel = supabase
      .channel(`checklist-meta-${checklistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chkchk_checklists',
          filter: `id=eq.${checklistId}`,
        },
        async () => {
          const checklist = await fetchChecklistById(checklistId)
          if (checklist) set({ checklist })
        },
      )
      .subscribe()

    const leadNotesChannel = supabase
      .channel(`checklist-lead-notes-${checklistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chkchk_lead_notes',
          filter: `checklist_id=eq.${checklistId}`,
        },
        async () => {
          const leadNotes = await fetchLeadNotes(checklistId)
          const leadNoteAuthors = await fetchDisplayNames([
            ...new Set(leadNotes.map((note) => note.user_id)),
          ])
          set({ leadNotes, leadNoteAuthors })
        },
      )
      .subscribe()

    set({ channels: [itemsChannel, commentsChannel, checklistChannel, leadNotesChannel] })
  },

  unsubscribe: () => {
    const { channels } = get()
    channels.forEach((channel) => {
      void supabase.removeChannel(channel)
    })
    set({ channels: [] })
  },

  toggleItem: async (itemId, completed) => {
    const previous = get().items
    const previousChecklist = get().checklist
    set({
      items: previous.map((item) =>
        item.id === itemId ? { ...item, completed } : item,
      ),
    })

    try {
      await updateItem(itemId, { completed })
      // Clear Current when that task is checked done
      if (completed && previousChecklist?.current_item_id === itemId) {
        const updated = await setCurrentItem(previousChecklist.id, null)
        set({ checklist: updated })
      }
    } catch (error) {
      set({
        items: previous,
        checklist: previousChecklist,
        error: error instanceof Error ? error.message : 'Update failed',
      })
    }
  },

  markItemCurrent: async (itemId) => {
    const { checklist } = get()
    if (!checklist || checklist.current_item_id === itemId) return
    try {
      const updated = await setCurrentItem(checklist.id, itemId)
      set({ checklist: updated })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set current task' })
    }
  },

  updateItemTask: async (itemId, task) => {
    try {
      const updated = await updateItem(itemId, { task })
      set({
        items: get().items.map((item) => (item.id === itemId ? updated : item)),
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update item' })
    }
  },

  addItem: async (task) => {
    const { checklist, items } = get()
    if (!checklist) return

    try {
      const item = await createItem(checklist.id, task, items.length)
      set({ items: [...items, item] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add item' })
    }
  },

  removeItem: async (itemId) => {
    const previousItems = get().items
    const previousComments = get().comments
    set({
      items: previousItems.filter((item) => item.id !== itemId),
      comments: previousComments.filter((comment) => comment.item_id !== itemId),
    })

    try {
      await deleteItem(itemId)
    } catch (error) {
      set({
        items: previousItems,
        comments: previousComments,
        error: error instanceof Error ? error.message : 'Failed to delete item',
      })
    }
  },

  reorderLocalItems: async (items) => {
    const previous = get().items
    set({ items })
    try {
      await reorderItems(items)
    } catch (error) {
      set({ items: previous, error: error instanceof Error ? error.message : 'Reorder failed' })
    }
  },

  addComment: async (itemId, userId, text) => {
    try {
      const comment = await createComment(itemId, userId, text)
      set({ comments: [...get().comments, comment] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add comment' })
    }
  },

  addLeadNote: async (text) => {
    const { checklist, leadNotes } = get()
    if (!checklist) return

    try {
      const note = await createLeadNoteApi(checklist.id, text)
      const leadNoteAuthors = await fetchDisplayNames([
        ...new Set([...leadNotes, note].map((n) => n.user_id)),
      ])
      set({ leadNotes: [...leadNotes, note], leadNoteAuthors, error: null })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add lead note' })
    }
  },

  saveSettings: async (title, description) => {
    const { checklist } = get()
    if (!checklist) return

    try {
      const updated = await updateChecklist(checklist.id, { title, description })
      set({ checklist: updated })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save settings' })
    }
  },

  deleteCurrentChecklist: async () => {
    const { checklist } = get()
    if (!checklist) return false

    try {
      await deleteChecklist(checklist.id)
      return true
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete checklist' })
      return false
    }
  },

  inviteCollaboratorByEmail: async (email, role) => {
    const { checklist } = get()
    if (!checklist) return

    try {
      const collab = await inviteCollaborator(checklist.id, email, role)
      const collaborators = await fetchCollaborators(checklist.id)
      set({ collaborators, error: null })

      if (role === 'assignee') {
        await notifyAssignee(checklist.id, collab.user_id)
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to invite collaborator' })
    }
  },

  inviteRosterMemberBySlot: async (slotId, role) => {
    const { checklist } = get()
    if (!checklist) return

    try {
      const userId = await inviteRosterMember(checklist.id, slotId, role)
      const collaborators = await fetchCollaborators(checklist.id)
      set({ collaborators, error: null })

      if (role === 'assignee') {
        await notifyAssignee(checklist.id, userId)
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to assign team member' })
    }
  },

  removeCollaboratorById: async (id) => {
    const { checklist } = get()
    if (!checklist) return

    try {
      await removeCollaborator(id)
      const collaborators = await fetchCollaborators(checklist.id)
      set({ collaborators })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove collaborator' })
    }
  },

  uploadItemAttachment: async (itemId, userId, file) => {
    set({ uploadProgress: 0, error: null })
    try {
      await uploadAttachment(itemId, userId, file, (percent) => {
        set({ uploadProgress: percent })
      })
      set({ uploadProgress: null })
    } catch (error) {
      set({
        uploadProgress: null,
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }
  },

  markComplete: async () => {
    const { checklist } = get()
    if (!checklist) return
    try {
      await markCardComplete(checklist.id)
      set({ checklist: { ...checklist, status: 'awaiting_confirmation' } })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to mark complete' })
    }
  },
}))
