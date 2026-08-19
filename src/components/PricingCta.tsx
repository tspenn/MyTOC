import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { startCheckout } from '../lib/stripeCheckout'
import type { BillingInterval, PlanDefinition } from '../lib/pricing'

interface PricingCtaProps {
  plan: PlanDefinition
  interval: BillingInterval
  variant?: 'primary' | 'gold'
  /** Trial signup never hits Stripe. Subscribe is the sales/coupon path. */
  mode?: 'start-trial' | 'subscribe'
}

export default function PricingCta({
  plan,
  interval,
  variant = 'primary',
  mode = 'start-trial',
}: PricingCtaProps) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)

    if (mode === 'start-trial') {
      if (isAuthenticated) {
        navigate('/dashboard')
        return
      }
      navigate(`/signup?plan=${plan.tier}`)
      return
    }

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/settings?tab=upgrade' } })
      return
    }

    setLoading(true)
    try {
      const url = await startCheckout(plan.tier, interval)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  const btnClass = variant === 'gold' ? 'btn btn-gold btn-full pricing-cta' : 'btn btn-primary btn-full pricing-cta'
  const label = mode === 'subscribe'
    ? (loading ? 'Opening Stripe…' : `Subscribe — ${plan.name}`)
    : `Start ${plan.name}`

  return (
    <div className="pricing-cta-wrap">
      {error && <p className="pricing-cta-error">{error}</p>}
      <button type="button" className={btnClass} disabled={loading} onClick={() => void handleClick()}>
        {label}
      </button>
      <p className="pricing-cta-sub">
        {mode === 'subscribe' ? (
          <>Pay with a card or enter a coupon on Stripe.</>
        ) : (
          <>
            14-day free trial, no credit card.{' '}
            {!isAuthenticated && <Link to="/login">Already have an account?</Link>}
          </>
        )}
      </p>
    </div>
  )
}
