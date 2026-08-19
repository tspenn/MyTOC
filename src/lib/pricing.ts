export type PlanTier = 'solo' | 'team'
export type BillingInterval = 'monthly' | 'annual'

export interface PlanDefinition {
  tier: PlanTier
  name: string
  monthlyPrice: number
  annualPrice: number
  description: string
  features: string[]
  featured?: boolean
  priceIds: Record<BillingInterval, string>
}

const SHARED_FEATURES = [
  'Unlimited Directives',
  'Real-time status & confirmation',
  'Clean audit trail',
  'Push notifications',
  'Mobile-first PWA',
] as const

export const PLANS: PlanDefinition[] = [
  {
    tier: 'solo',
    name: 'Solo Command',
    monthlyPrice: 19,
    annualPrice: 190,
    description: 'Built for the individual COO or executive who needs a personal command layer for their closest team members.',
    features: ['1 Lead account', 'Up to 5 Team Members', ...SHARED_FEATURES],
    priceIds: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_SOLO_MONTHLY ?? 'price_1U2BM3IVCtEWvFGCtPFE4juc',
      annual: import.meta.env.VITE_STRIPE_PRICE_SOLO_ANNUAL ?? 'price_1U2BM7IVCtEWvFGCAYUlrFMO',
    },
  },
  {
    tier: 'team',
    name: 'Team Command',
    monthlyPrice: 49,
    annualPrice: 490,
    description: 'Built for executive ops — COOs, chiefs of staff, and small cross-functional leadership groups.',
    features: ['3 Lead accounts', 'Up to 25 Team Members', ...SHARED_FEATURES, 'Priority support'],
    featured: true,
    priceIds: {
      monthly: import.meta.env.VITE_STRIPE_PRICE_TEAM_MONTHLY ?? 'price_1U2BM8IVCtEWvFGC43aLw5p8',
      annual: import.meta.env.VITE_STRIPE_PRICE_TEAM_ANNUAL ?? 'price_1U2BMEIVCtEWvFGCeNtHnpCE',
    },
  },
]

export function getPlan(tier: PlanTier): PlanDefinition {
  const plan = PLANS.find((p) => p.tier === tier)
  if (!plan) throw new Error(`Unknown plan: ${tier}`)
  return plan
}

export function getPriceId(tier: PlanTier, interval: BillingInterval): string {
  return getPlan(tier).priceIds[interval]
}

export function isPlanTier(value: string | null | undefined): value is PlanTier {
  return value === 'solo' || value === 'team'
}

export function planDisplayName(tier: string | null | undefined): string {
  if (tier === 'solo') return 'Solo Command'
  if (tier === 'team') return 'Team Command'
  return tier ?? 'Paid'
}
