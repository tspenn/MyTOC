/** Auth metadata + profiles.tier id for MyTOC free signups on shared Skyland Supabase. */
export const SIGNUP_APP_ID = 'toc'

/** profiles.tier written on MyTOC signup. Customer-facing label stays Free. */
export const TOC_FREE_TIER_ID = 'toc_free'

/** Shared Skyland free ids — unpaid in MyTOC; never overwrite on shared accounts. */
const SISTER_FREE_TIER_IDS = new Set([
  'support',
  'free',
  'sa_free',
  'goshop_free',
  'msa-trial',
  'trial-fc',
  'notie_free',
  'my_lokr_free',
])

export function isFreeProfilesTier(tier: string | null | undefined): boolean {
  if (!tier) return true
  const t = tier.toLowerCase()
  if (t === TOC_FREE_TIER_ID) return true
  if (SISTER_FREE_TIER_IDS.has(t)) return true
  return t.endsWith('_free') || t.endsWith('-trial')
}

export function tierDisplayName(tier: string | null | undefined): string {
  if (isFreeProfilesTier(tier)) return 'Free'
  return tier ?? 'Free'
}

/** Only write toc_free for new/blank profiles — never replace a sister-app tier. */
export function shouldWriteTocFreeTier(currentTier: string | null | undefined): boolean {
  if (!currentTier) return true
  const t = currentTier.toLowerCase()
  return t === TOC_FREE_TIER_ID
}
