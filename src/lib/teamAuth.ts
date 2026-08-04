/** Synthetic login email for team members (Lead ID + worker #).
 *  Uses @team.chkchk.local so the shared deployed team-signup-chkchk edge function works.
 */
export function teamLoginEmail(leadCode: string, workerNumber: string): string {
  const code = leadCode.trim().toLowerCase()
  const num = workerNumber.trim().replace(/\D/g, '')
  return `${code}-${num}@team.chkchk.local`
}

export function formatTeamMemberLabel(name: string, workerNumber: string): string {
  return `Team Member — ${name} #${workerNumber}`
}

export function teamSignupUrl(leadCode: string, workerNumber: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://mytoc-eta.vercel.app'
  const params = new URLSearchParams({
    lead: leadCode.trim(),
    worker: workerNumber.trim(),
  })
  return `${base}/team-signup?${params.toString()}`
}

export function teamInviteSms(leadCode: string, workerNumber: string, memberName: string): string {
  const link = teamSignupUrl(leadCode, workerNumber)
  return [
    `Hi ${memberName}! Join my MyTOC team:`,
    link,
    `Lead ID: ${leadCode.trim()}`,
    `Your #: ${workerNumber.trim()}`,
    'Pick a password when you sign up. Turn on notifications in Profile!',
  ].join('\n')
}

/** Opens the Lead's own email app with invite pre-filled (not app-sent email). */
export function teamInviteMailto(leadCode: string, workerNumber: string, memberName: string): string {
  const subject = encodeURIComponent(`Join my MyTOC team — ${memberName}`)
  const body = encodeURIComponent(teamInviteSms(leadCode, workerNumber, memberName))
  return `mailto:?subject=${subject}&body=${body}`
}

export function coLeadInviteUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://mytoc-eta.vercel.app'
  return `${base}/join-lead?token=${encodeURIComponent(token.trim())}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
