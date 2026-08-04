import { supabase } from './supabase'
import { withRetry, isRlsError } from './retry'
import type {
  Checklist,
  ChecklistComment,
  ChecklistCollaborator,
  ChecklistItem,
  CollaboratorProfile,
  CollaboratorRole,
  DashboardChecklist,
  UserRole,
} from './types'

export class AccessDeniedError extends Error {
  constructor(message = 'Access Denied') {
    super(message)
    this.name = 'AccessDeniedError'
  }
}

function throwIfRls(error: { code?: string; message?: string } | null) {
  if (isRlsError(error)) {
    throw new AccessDeniedError()
  }
  if (error) {
    throw error
  }
}

export async function fetchOwnedChecklists(userId: string): Promise<DashboardChecklist[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('chkchk_checklists')
      // Hint the items→checklist FK — current_item_id creates a second relationship
      // and PostgREST rejects an ambiguous embed with "Failed to load checklists".
      .select('*, chkchk_items!chkchk_items_checklist_id_fkey(count)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      description: row.description,
      status: (row.status ?? 'active') as import('./types').CardStatus,
      current_item_id: row.current_item_id ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      item_count: row.chkchk_items?.[0]?.count ?? 0,
    }))
  })
}

export async function fetchAccessibleChecklistIds(userId: string): Promise<string[]> {
  const { data: ownedFull, error: ownedError } = await supabase
    .from('chkchk_checklists')
    .select('id, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (ownedError) throw ownedError

  const { data: shared, error: sharedError } = await supabase
    .from('chkchk_collaborators')
    .select('checklist_id, chkchk_checklists(id, updated_at)')
    .eq('user_id', userId)

  if (sharedError) throw sharedError

  type ChecklistRef = { id: string; updated_at: string }

  const sharedChecklists = (shared ?? [])
    .map((row) => {
      const checklistData = row.chkchk_checklists as ChecklistRef | ChecklistRef[] | null
      if (Array.isArray(checklistData)) return checklistData[0] ?? null
      return checklistData
    })
    .filter((row): row is ChecklistRef => Boolean(row))

  const combined = [...(ownedFull ?? []), ...sharedChecklists]
  const unique = new Map<string, string>()

  for (const row of combined) {
    if (!unique.has(row.id)) {
      unique.set(row.id, row.updated_at)
    }
  }

  return [...unique.entries()]
    .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
    .map(([id]) => id)
}

export async function fetchChecklistById(id: string): Promise<Checklist | null> {
  const { data, error } = await supabase
    .from('chkchk_checklists')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throwIfRls(error)
  return data
}

export async function createChecklist(
  userId: string,
  title: string,
  description: string,
): Promise<Checklist> {
  const { data, error } = await supabase
    .from('chkchk_checklists')
    .insert({ user_id: userId, title, description: description || null })
    .select('*')
    .single()

  if (error) throwIfRls(error)
  return data
}

export async function updateChecklist(
  id: string,
  updates: Partial<Pick<Checklist, 'title' | 'description'>>,
): Promise<Checklist> {
  const { data, error } = await supabase
    .from('chkchk_checklists')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throwIfRls(error)
  return data
}

/** Crew opens a task card → marks it Current for the Lead. Pass null to clear. */
export async function setCurrentItem(
  checklistId: string,
  itemId: string | null,
): Promise<Checklist> {
  const { data, error } = await supabase.rpc('chkchk_set_current_item', {
    p_checklist_id: checklistId,
    p_item_id: itemId,
  })
  if (error) throwIfRls(error)
  return data as Checklist
}

export async function deleteChecklist(id: string): Promise<void> {
  const { error } = await supabase.from('chkchk_checklists').delete().eq('id', id)
  if (error) throwIfRls(error)
}

export async function fetchItems(checklistId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('chkchk_items')
    .select('*')
    .eq('checklist_id', checklistId)
    .order('order', { ascending: true })

  if (error) throwIfRls(error)
  return data ?? []
}

export async function createItem(checklistId: string, task: string, order: number): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from('chkchk_items')
    .insert({ checklist_id: checklistId, task, order })
    .select('*')
    .single()

  if (error) throwIfRls(error)
  return data
}

export async function updateItem(
  id: string,
  updates: Partial<Pick<ChecklistItem, 'task' | 'completed' | 'order'>>,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from('chkchk_items')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throwIfRls(error)
  return data
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('chkchk_items').delete().eq('id', id)
  if (error) throwIfRls(error)
}

export async function reorderItems(items: ChecklistItem[]): Promise<void> {
  const results = await Promise.all(
    items.map((item, index) =>
      supabase.from('chkchk_items').update({ order: index }).eq('id', item.id),
    ),
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) throwIfRls(failed.error)
}

export async function fetchCommentsForItems(itemIds: string[]): Promise<ChecklistComment[]> {
  if (itemIds.length === 0) return []

  const { data, error } = await supabase
    .from('chkchk_comments')
    .select('*')
    .in('item_id', itemIds)
    .order('created_at', { ascending: true })

  if (error) throwIfRls(error)
  return data ?? []
}

export async function createComment(
  itemId: string,
  userId: string,
  text: string,
): Promise<ChecklistComment> {
  const { data, error } = await supabase
    .from('chkchk_comments')
    .insert({ item_id: itemId, user_id: userId, text })
    .select('*')
    .single()

  if (error) throwIfRls(error)
  return data
}

export async function fetchCollaborators(checklistId: string): Promise<CollaboratorProfile[]> {
  const { data, error } = await supabase
    .from('chkchk_collaborators')
    .select('*')
    .eq('checklist_id', checklistId)
    .order('invited_at', { ascending: true })

  if (error) throwIfRls(error)
  if (!data?.length) return []

  const emails = await Promise.all(
    data.map(async (collaborator) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', collaborator.user_id)
        .maybeSingle()

      return {
        ...collaborator,
        role: collaborator.role as CollaboratorRole,
        email: profile?.email ?? null,
      }
    }),
  )

  return emails
}

export async function inviteCollaborator(
  checklistId: string,
  email: string,
  role: CollaboratorRole,
): Promise<ChecklistCollaborator> {
  const { data: userId, error: lookupError } = await supabase.rpc('chkchk_lookup_user_id_by_email', {
    target_email: email.trim(),
  })

  if (lookupError) throw lookupError
  if (!userId) {
    throw new Error('No user found with that email.')
  }

  const { data, error } = await supabase
    .from('chkchk_collaborators')
    .insert({ checklist_id: checklistId, user_id: userId, role })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This user is already a collaborator.')
    }
    throwIfRls(error)
  }

  return { ...data, role: data.role as CollaboratorRole }
}

export async function removeCollaborator(id: string): Promise<void> {
  const { error } = await supabase.from('chkchk_collaborators').delete().eq('id', id)
  if (error) throwIfRls(error)
}

export async function uploadAttachment(
  itemId: string,
  userId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File must be 10 MB or smaller.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${itemId}/${Date.now()}-${safeName}`

  onProgress?.(10)

  const { error } = await supabase.storage.from('chkchk-attachments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  onProgress?.(70)
  if (error) throw error

  const { data } = supabase.storage.from('chkchk-attachments').getPublicUrl(path)
  const fileUrl = data.publicUrl

  const { error: insertError } = await supabase.from('chkchk_attachments').insert({
    item_id: itemId,
    file_url: fileUrl,
    file_name: file.name,
    file_size: file.size,
  })

  onProgress?.(100)
  if (insertError) throwIfRls(insertError)

  return fileUrl
}

export async function fetchUserEmails(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {}

  const uniqueIds = [...new Set(userIds)]
  const results: Record<string, string> = {}

  await Promise.all(
    uniqueIds.map(async (id) => {
      const { data } = await supabase.from('profiles').select('email').eq('id', id).maybeSingle()
      if (data?.email) {
        results[id] = data.email
      }
    }),
  )

  return results
}

export async function fetchDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {}

  const uniqueIds = [...new Set(userIds)]
  const { data, error } = await supabase.rpc('chkchk_get_display_names', {
    p_user_ids: uniqueIds,
  })

  if (error || !data) return {}

  const results: Record<string, string> = {}
  for (const row of data as { user_id: string; name: string }[]) {
    results[row.user_id] = row.name
  }
  return results
}

// ---------------------------------------------------------------------------
// User role
// ---------------------------------------------------------------------------

export async function fetchMyRole(): Promise<{
  role: UserRole
  displayName: string
  isAvailable: boolean
} | null> {
  const { data, error } = await supabase.rpc('chkchk_get_my_role')
  if (error || !data) return null
  const result = data as { role: UserRole; display_name: string; is_available?: boolean } | null
  if (!result?.role) return null
  return {
    role: result.role,
    displayName: result.display_name ?? '',
    isAvailable: result.is_available ?? true,
  }
}

export async function setMyRole(
  role: UserRole,
  options?: { phone?: string; displayName?: string },
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('chkchk_user_roles')
    .upsert({
      user_id: user.id,
      role,
      phone: options?.phone?.trim() || null,
      display_name: options?.displayName?.trim() || null,
    })

  if (error) throw error
}

export async function updateDisplayName(displayName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('chkchk_user_roles')
    .upsert({ user_id: user.id, display_name: displayName.trim() })

  if (error) throw error
}

export async function updateLeadAvailability(isAvailable: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('chkchk_user_roles')
    .update({ is_available: isAvailable })
    .eq('user_id', user.id)

  if (error) throw error
}

export interface TrialStatus {
  trial_started_at: string
  days_remaining: number
  is_expired: boolean
}

export async function fetchTrialStatus(): Promise<TrialStatus | null> {
  const { data, error } = await supabase.rpc('chkchk_get_trial_status')
  if (error || !data) return null
  return data as TrialStatus
}

// ---------------------------------------------------------------------------
// Assignee: fetch assigned cards
// ---------------------------------------------------------------------------

export async function fetchAssignedCards(): Promise<DashboardChecklist[]> {
  const { data, error } = await supabase.rpc('chkchk_get_assigned_cards')
  if (error) throw error

  return (data ?? []).map((row: DashboardChecklist & { item_count: string | number }) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    current_item_id: row.current_item_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    item_count: Number(row.item_count),
  }))
}

// ---------------------------------------------------------------------------
// Status transitions (SECURITY DEFINER RPCs)
// ---------------------------------------------------------------------------

export async function markCardComplete(checklistId: string): Promise<void> {
  const { error } = await supabase.rpc('chkchk_mark_card_complete', {
    p_checklist_id: checklistId,
  })
  if (error) throw error
}

export async function confirmCard(checklistId: string): Promise<void> {
  const { error } = await supabase.rpc('chkchk_confirm_card', {
    p_checklist_id: checklistId,
  })
  if (error) throw error
}

export async function rejectCard(checklistId: string): Promise<void> {
  const { error } = await supabase.rpc('chkchk_reject_card', {
    p_checklist_id: checklistId,
  })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Push notification when crew is assigned (Web Push — not SMS/Twilio)
// ---------------------------------------------------------------------------

export async function notifyAssignee(
  checklistId: string,
  assigneeUserId: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-assignee-chkchk', {
    body: { checklist_id: checklistId, assignee_user_id: assigneeUserId },
  })
  // Non-fatal: missing subscription / push failure shouldn't block invite
  if (error) console.warn('Push notification failed:', error)
}
