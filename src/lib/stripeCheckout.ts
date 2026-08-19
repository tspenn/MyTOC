import { supabase } from './supabase'
import type { BillingInterval, PlanTier } from './pricing'
import { getPriceId } from './pricing'

export async function startCheckout(tier: PlanTier, interval: BillingInterval): Promise<string> {
  const priceId = getPriceId(tier, interval)

  const { data, error } = await supabase.functions.invoke('create-checkout-toc', {
    body: { price_id: priceId },
  })

  if (error) {
    throw new Error(error.message || 'Could not start checkout')
  }

  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error)
  }

  const url = data && typeof data === 'object' && 'url' in data ? String(data.url) : ''
  if (!url) {
    throw new Error('Checkout URL missing — is Stripe configured?')
  }

  return url
}
