import {
  ensureLeadCode,
  ensureTeamForLead,
  fetchMyRole,
  setMyRole,
} from './checklistApi'
import { supabase } from './supabase'

const PENDING_LEAD_KEY = 'mytoc_pending_lead'
const PENDING_COLEAD_KEY = 'mytoc_pending_colead'
const LEGACY_PENDING_LEAD_KEY = 'chkchk_pending_lead'
const LEGACY_PENDING_COLEAD_KEY = 'chkchk_pending_colead'

export function isTeamMemberLoginEmail(email: string | undefined | null): boolean {
  const lower = email?.toLowerCase() ?? ''
  return lower.endsWith('@team.chkchk.local') || lower.endsWith('@team.mytoc.local')
}

export function savePendingLeadSignup(displayName: string): void {
  sessionStorage.setItem(PENDING_LEAD_KEY, JSON.stringify({ displayName: displayName.trim() }))
}

export function readPendingLeadSignup(): { displayName: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_LEAD_KEY)
      ?? sessionStorage.getItem(LEGACY_PENDING_LEAD_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { displayName?: string }
    if (!parsed.displayName?.trim()) return null
    return { displayName: parsed.displayName.trim() }
  } catch {
    return null
  }
}

export function clearPendingLeadSignup(): void {
  sessionStorage.removeItem(PENDING_LEAD_KEY)
  sessionStorage.removeItem(LEGACY_PENDING_LEAD_KEY)
}

export function savePendingCoLeadInvite(token: string): void {
  sessionStorage.setItem(PENDING_COLEAD_KEY, token.trim())
}

export function readPendingCoLeadInvite(): string | null {
  return sessionStorage.getItem(PENDING_COLEAD_KEY)
    ?? sessionStorage.getItem(LEGACY_PENDING_COLEAD_KEY)
}

export function clearPendingCoLeadInvite(): void {
  sessionStorage.removeItem(PENDING_COLEAD_KEY)
  sessionStorage.removeItem(LEGACY_PENDING_COLEAD_KEY)
}

/** Email Leads: ensure role + team workspace exist (fixes confirm-email-then-login gap). */
export async function ensureLeadAccount(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || isTeamMemberLoginEmail(user.email)) return
  if (readPendingCoLeadInvite()) return

  const pending = readPendingLeadSignup()
  const name = pending?.displayName || user.user_metadata?.full_name as string | undefined
  const role = await fetchMyRole()

  if (!role?.role) {
    await setMyRole('assigner', { displayName: name || undefined })
    await ensureTeamForLead()
    await ensureLeadCode()
    clearPendingLeadSignup()
    return
  }

  if (role.role === 'assigner' && !role.teamId) {
    await ensureTeamForLead()
    await ensureLeadCode()
  }
}

export async function syncAuthRoleFromServer(): Promise<Awaited<ReturnType<typeof fetchMyRole>>> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (!isTeamMemberLoginEmail(user.email)) {
    await ensureLeadAccount()
  }

  return fetchMyRole()
}
