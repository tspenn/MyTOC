import { supabase } from './supabase'
import { withRetry, isRlsError } from './retry'
import { isFreeProfilesTier, tierDisplayName } from './signupApp'
import { planDisplayName } from './pricing'
import type {
  Checklist,
  ChecklistAttachment,
  ChecklistComment,
  ChecklistCollaborator,
  ChecklistItem,
  CollaboratorProfile,
  CollaboratorRole,
  DashboardChecklist,
  CoLeadInvite,
  LeadNote,
  TeamLeadMember,
  TeamSlot,
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

export async function fetchOwnedChecklists(_userId: string): Promise<DashboardChecklist[]> {
  return withRetry(async () => {
    const { data, error } = await supabase.rpc('chkchk_get_team_checklists')
    if (error) {
      // Fall through to direct query — don't surface RPC blips as "Access Denied"
      console.warn('chkchk_get_team_checklists failed:', error.message)
    } else {
      const rows = ((data ?? []) as DashboardChecklist[]).map((row) => ({
        ...row,
        status: (row.status ?? 'active') as import('./types').CardStatus,
        team_id: row.team_id ?? null,
        item_count: row.item_count ?? 0,
      }))
      if (rows.length > 0) return rows
    }

    // Fallback: personally owned orders (works even if team_id was never set)
    const { data: owned, error: ownedError } = await supabase
      .from('chkchk_checklists')
      .select('*, chkchk_items!chkchk_items_checklist_id_fkey(count)')
      .eq('user_id', _userId)
      .order('updated_at', { ascending: false })
    if (ownedError) throw new Error(ownedError.message)

    return (owned ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      team_id: row.team_id ?? null,
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

export async function fetchMyTeamId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('chkchk_get_user_team_id')
  if (error) return null
  return data as string | null
}

export async function fetchAccessibleChecklistIds(userId: string): Promise<string[]> {
  const teamId = await fetchMyTeamId()

  const ownedQuery = teamId
    ? supabase.from('chkchk_checklists').select('id, updated_at').eq('team_id', teamId)
    : supabase.from('chkchk_checklists').select('id, updated_at').eq('user_id', userId)

  const { data: ownedFull, error: ownedError } = await ownedQuery.order('updated_at', { ascending: false })

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
  _userId: string,
  title: string,
  description: string,
): Promise<Checklist> {
  // SECURITY DEFINER RPC — avoids INSERT…RETURNING RLS failures that show as "Access Denied"
  const { data, error } = await supabase.rpc('chkchk_create_checklist', {
    p_title: title.trim(),
    p_description: description.trim() || null,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Could not create directive')
  return data as Checklist
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

export async function fetchCommentsForChecklist(
  checklistId: string,
  itemIds: string[],
): Promise<ChecklistComment[]> {
  const { data: orderComments, error: orderError } = await supabase
    .from('chkchk_comments')
    .select('id, item_id, checklist_id, user_id, text, created_at')
    .eq('checklist_id', checklistId)
    .is('item_id', null)
    .order('created_at', { ascending: true })

  if (orderError) throwIfRls(orderError)

  let taskComments: ChecklistComment[] = []
  if (itemIds.length > 0) {
    const { data, error } = await supabase
      .from('chkchk_comments')
      .select('id, item_id, checklist_id, user_id, text, created_at')
      .in('item_id', itemIds)
      .order('created_at', { ascending: true })
    if (error) throwIfRls(error)
    taskComments = (data ?? []) as ChecklistComment[]
  }

  const merged = [...((orderComments ?? []) as ChecklistComment[]), ...taskComments]
  merged.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  return merged
}

/** @deprecated use fetchCommentsForChecklist */
export async function fetchCommentsForItems(itemIds: string[]): Promise<ChecklistComment[]> {
  if (itemIds.length === 0) return []
  const { data, error } = await supabase
    .from('chkchk_comments')
    .select('id, item_id, checklist_id, user_id, text, created_at')
    .in('item_id', itemIds)
    .order('created_at', { ascending: true })
  if (error) throwIfRls(error)
  return (data ?? []) as ChecklistComment[]
}

export async function createComment(
  itemId: string | null,
  userId: string,
  text: string,
  checklistId?: string,
): Promise<ChecklistComment> {
  if (!itemId && !checklistId) {
    throw new Error('Pick Whole directive or an item before sending')
  }
  const row: Record<string, string | null> = {
    item_id: itemId,
    user_id: userId,
    text,
    checklist_id: checklistId ?? null,
  }
  const { data, error } = await supabase
    .from('chkchk_comments')
    .insert(row)
    .select('id, item_id, checklist_id, user_id, text, created_at')
    .single()

  if (error) throwIfRls(error)
  return data as ChecklistComment
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

      const { data: roleRow } = await supabase
        .from('chkchk_user_roles')
        .select('display_name')
        .eq('user_id', collaborator.user_id)
        .maybeSingle()

      const { data: slotRow } = await supabase
        .from('chkchk_team_slots')
        .select('worker_number')
        .eq('user_id', collaborator.user_id)
        .eq('status', 'active')
        .maybeSingle()

      const email = profile?.email ?? null
      const isTeamLocal = !!email && (
        email.endsWith('@team.chkchk.local') || email.endsWith('@team.mytoc.local')
      )

      return {
        ...collaborator,
        role: collaborator.role as CollaboratorRole,
        email: isTeamLocal ? null : email,
        displayName: roleRow?.display_name ?? null,
        workerNumber: slotRow?.worker_number ?? null,
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

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024

function assertAttachableFile(file: File) {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('File must be 50 MB or smaller.')
  }
}

async function storeAttachmentFile(
  userId: string,
  folderKey: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${folderKey}/${Date.now()}-${safeName}`

  onProgress?.(10)

  const { error } = await supabase.storage.from('chkchk-attachments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  onProgress?.(70)
  if (error) throw error

  const { data } = supabase.storage.from('chkchk-attachments').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadAttachment(
  itemId: string,
  checklistId: string,
  userId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ChecklistAttachment> {
  assertAttachableFile(file)
  const fileUrl = await storeAttachmentFile(userId, itemId, file, onProgress)

  const { data, error: insertError } = await supabase
    .from('chkchk_attachments')
    .insert({
      item_id: itemId,
      checklist_id: checklistId,
      uploaded_by: userId,
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
    })
    .select('id, item_id, checklist_id, uploaded_by, file_url, file_name, file_size, created_at')
    .single()

  onProgress?.(100)
  if (insertError) throwIfRls(insertError)
  return data as ChecklistAttachment
}

/** Directive-level file (finished work, invoice, receipt, photo/video) — not tied to one item. */
export async function uploadOrderFile(
  checklistId: string,
  userId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ChecklistAttachment> {
  assertAttachableFile(file)
  const fileUrl = await storeAttachmentFile(userId, checklistId, file, onProgress)

  const { data, error: insertError } = await supabase
    .from('chkchk_attachments')
    .insert({
      item_id: null,
      checklist_id: checklistId,
      uploaded_by: userId,
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
    })
    .select('id, item_id, checklist_id, uploaded_by, file_url, file_name, file_size, created_at')
    .single()

  onProgress?.(100)
  if (insertError) throwIfRls(insertError)
  return data as ChecklistAttachment
}

export async function fetchAttachmentsForChecklist(
  checklistId: string,
): Promise<ChecklistAttachment[]> {
  const { data, error } = await supabase
    .from('chkchk_attachments')
    .select('id, item_id, checklist_id, uploaded_by, file_url, file_name, file_size, created_at')
    .eq('checklist_id', checklistId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ChecklistAttachment[]
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const { error } = await supabase.from('chkchk_attachments').delete().eq('id', attachmentId)
  if (error) throwIfRls(error)
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
  leadCode: string | null
  workerNumber: string | null
  teamId: string | null
  isPrimaryLead: boolean
} | null> {
  const { data, error } = await supabase.rpc('chkchk_get_my_role')
  if (error || !data) return null
  const result = data as {
    role: UserRole
    display_name: string
    is_available?: boolean
    boss_code?: string | null
    worker_number?: string | null
    team_id?: string | null
    is_primary_lead?: boolean
  } | null
  if (!result?.role) return null
  return {
    role: result.role,
    displayName: result.display_name ?? '',
    isAvailable: result.is_available ?? true,
    leadCode: result.boss_code ?? null,
    workerNumber: result.worker_number ?? null,
    teamId: result.team_id ?? null,
    isPrimaryLead: result.is_primary_lead ?? false,
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

  const { data, error } = await supabase
    .from('chkchk_user_roles')
    .update({ display_name: displayName.trim() })
    .eq('user_id', user.id)
    .select('user_id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Could not save name. Your account role is not set up yet.')
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
  has_subscription?: boolean
  plan_tier?: string | null
  subscription_status?: string | null
  profiles_tier?: string | null
  plan_label?: string
}

export async function fetchTrialStatus(): Promise<TrialStatus | null> {
  const { data, error } = await supabase.rpc('chkchk_get_trial_status')
  if (error || !data) return null
  const status = data as TrialStatus

  const { data: { user } } = await supabase.auth.getUser()
  let profilesTier: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .maybeSingle()
    profilesTier = (profile?.tier as string | null | undefined) ?? null
  }

  // MyTOC billing lives on chkchk_subscriptions. profiles.tier is the shared
  // Skyland signup marker — toc_free and sister-app free ids stay unpaid here.
  const freeOnSharedProfile = isFreeProfilesTier(profilesTier)
  const planLabel = status.has_subscription
    ? planDisplayName(status.plan_tier)
    : tierDisplayName(profilesTier)

  return {
    ...status,
    profiles_tier: profilesTier,
    plan_label: freeOnSharedProfile && !status.has_subscription ? 'Free' : planLabel,
  }
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

// ---------------------------------------------------------------------------
// Team roster (Lead ID + worker # invites)
// ---------------------------------------------------------------------------

export async function ensureLeadCode(): Promise<string> {
  const { data, error } = await supabase.rpc('chkchk_ensure_boss_code')
  if (error) throw error
  return String(data)
}

export async function createTeamSlot(displayName: string): Promise<TeamSlot> {
  const { data, error } = await supabase.rpc('chkchk_create_team_slot', {
    p_display_name: displayName.trim(),
  })
  if (error) throw error
  const row = data as { id: string; worker_number: string; display_name: string; status: string }
  return {
    id: row.id,
    worker_number: row.worker_number,
    display_name: row.display_name,
    user_id: null,
    status: row.status as TeamSlot['status'],
    created_at: new Date().toISOString(),
  }
}

export async function fetchTeamSlots(): Promise<TeamSlot[]> {
  const { data, error } = await supabase.rpc('chkchk_list_team_slots')
  if (error) throw error
  return (data ?? []) as TeamSlot[]
}

export async function validateTeamSlot(leadCode: string, workerNumber: string): Promise<{ valid: boolean; display_name?: string }> {
  const { data, error } = await supabase.rpc('chkchk_validate_team_slot', {
    p_boss_code: leadCode.trim(),
    p_worker_number: workerNumber.trim(),
  })
  if (error) throw error
  return (data ?? { valid: false }) as { valid: boolean; display_name?: string }
}

export async function teamSignup(leadCode: string, workerNumber: string, password: string): Promise<{ email: string; display_name: string }> {
  const { data, error } = await supabase.functions.invoke('team-signup-chkchk', {
    body: { boss_code: leadCode.trim(), worker_number: workerNumber.trim(), password },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error)
  }
  return data as { email: string; display_name: string }
}

export async function inviteRosterMember(
  checklistId: string,
  slotId: string,
  role: CollaboratorRole = 'assignee',
): Promise<string> {
  const { data, error } = await supabase.rpc('chkchk_invite_roster_member', {
    p_checklist_id: checklistId,
    p_slot_id: slotId,
    p_role: role,
  })
  if (error) throw error
  return String(data)
}

// ---------------------------------------------------------------------------
// Lead notes (private to team Leads on a directive)
// ---------------------------------------------------------------------------

export async function fetchLeadNotes(checklistId: string): Promise<LeadNote[]> {
  const { data, error } = await supabase.rpc('chkchk_list_lead_notes', {
    p_checklist_id: checklistId,
  })
  if (error) throw error
  return (data ?? []) as LeadNote[]
}

export async function addLeadNote(checklistId: string, text: string): Promise<LeadNote> {
  const { data, error } = await supabase.rpc('chkchk_add_lead_note', {
    p_checklist_id: checklistId,
    p_text: text.trim(),
  })
  if (error) throw error
  return data as LeadNote
}

// ---------------------------------------------------------------------------
// Co-Leads (shared Lead board)
// ---------------------------------------------------------------------------

export async function fetchTeamLeads(): Promise<TeamLeadMember[]> {
  const { data, error } = await supabase.rpc('chkchk_list_team_leads')
  if (error) throw error
  return (data ?? []) as TeamLeadMember[]
}

export async function fetchCoLeadInvites(): Promise<CoLeadInvite[]> {
  const { data, error } = await supabase.rpc('chkchk_list_co_lead_invites')
  if (error) throw error
  return (data ?? []) as CoLeadInvite[]
}

export async function inviteCoLead(email: string): Promise<CoLeadInvite> {
  const { data, error } = await supabase.rpc('chkchk_invite_co_lead', {
    p_email: email.trim(),
  })
  if (error) throw error
  return data as CoLeadInvite
}

export async function validateCoLeadInvite(token: string): Promise<{ valid: boolean; email?: string }> {
  const { data, error } = await supabase.rpc('chkchk_validate_co_lead_invite', {
    p_token: token.trim(),
  })
  if (error) throw error
  return (data ?? { valid: false }) as { valid: boolean; email?: string }
}

export async function acceptCoLeadInvite(token: string): Promise<void> {
  const { error } = await supabase.rpc('chkchk_accept_co_lead_invite', {
    p_token: token.trim(),
  })
  if (error) throw error
}

export async function ensureTeamForLead(): Promise<string> {
  const { data, error } = await supabase.rpc('chkchk_ensure_team_for_lead')
  if (error) throw error
  return String(data)
}
