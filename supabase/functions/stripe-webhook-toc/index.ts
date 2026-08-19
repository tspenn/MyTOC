import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.7.0'

const PRICE_MAP: Record<string, { tier: string; interval: string }> = {
  price_1U2BM3IVCtEWvFGCtPFE4juc: { tier: 'solo', interval: 'monthly' },
  price_1U2BM7IVCtEWvFGCAYUlrFMO: { tier: 'solo', interval: 'annual' },
  price_1U2BM8IVCtEWvFGC43aLw5p8: { tier: 'team', interval: 'monthly' },
  price_1U2BMEIVCtEWvFGCeNtHnpCE: { tier: 'team', interval: 'annual' },
}

function planFromPriceId(priceId: string | undefined) {
  if (!priceId) return null
  return PRICE_MAP[priceId] ?? null
}

function admin() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key)
}

async function upsertSubscription(
  userId: string,
  sub: Stripe.Subscription,
  customerId: string | null,
) {
  const priceId = sub.items.data[0]?.price?.id
  const plan = planFromPriceId(priceId)
  const db = admin()
  const periodEnd = sub.items.data[0]?.current_period_end ?? (sub as { current_period_end?: number }).current_period_end

  const { error } = await db.from('chkchk_subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId ?? (typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null),
    stripe_subscription_id: sub.id,
    plan_tier: plan?.tier ?? null,
    billing_interval: plan?.interval ?? null,
    status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}

async function markCanceled(subscriptionId: string) {
  const db = admin()
  const { error } = await db
    .from('chkchk_subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId)
  if (error) throw error
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY_CHKCHK') || Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_TOC') || Deno.env.get('STRIPE_WEBHOOK_SECRET_CHKCHK') || Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!stripeKey || !webhookSecret) {
    console.error('Missing Stripe webhook secrets for MyTOC')
    return new Response('Webhook not configured', { status: 503 })
  }

  const stripe = new Stripe(stripeKey)
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.metadata?.app !== 'mytoc') break

        const userId = session.client_reference_id ?? session.metadata?.user_id
        const subscriptionId = session.subscription
        if (!userId || !subscriptionId || typeof subscriptionId !== 'string') break

        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        await upsertSubscription(userId, sub, typeof session.customer === 'string' ? session.customer : null)
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        if (sub.metadata?.app !== 'mytoc' && !planFromPriceId(sub.items.data[0]?.price?.id)) break

        const userId = sub.metadata?.user_id
        if (!userId) {
          const db = admin()
          const { data: row } = await db
            .from('chkchk_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', sub.id)
            .maybeSingle()
          if (!row?.user_id) break
          await upsertSubscription(row.user_id, sub, null)
        } else {
          await upsertSubscription(userId, sub, null)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await markCanceled(sub.id)
        break
      }

      default:
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('stripe-webhook-toc handler error:', err)
    return new Response('Webhook handler failed', { status: 500 })
  }
})
