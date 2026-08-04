import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify the calling user
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await callerClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { checklist_id, assignee_user_id } = await req.json() as {
      checklist_id: string
      assignee_user_id: string
    }

    if (!checklist_id || !assignee_user_id) {
      return new Response(JSON.stringify({ error: 'checklist_id and assignee_user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Confirm caller owns the checklist
    const { data: checklist } = await admin
      .from('chkchk_checklists')
      .select('title, user_id')
      .eq('id', checklist_id)
      .maybeSingle()

    if (!checklist || checklist.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not the card owner' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const publicKey  = Deno.env.get('WEB_PUSH_PUBLIC_KEY')  || ''
    const privateKey = Deno.env.get('WEB_PUSH_PRIVATE_KEY') || ''
    const contact    = Deno.env.get('WEB_PUSH_CONTACT')     || 'mailto:support@skylandapps.com'

    if (!publicKey || !privateKey) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'Web push keys not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch push subscriptions for the assignee from chkchk_push_subscriptions
    const { data: rows, error: subsErr } = await admin
      .from('chkchk_push_subscriptions')
      .select('id, subscription')
      .eq('user_id', assignee_user_id)

    if (subsErr) throw subsErr

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'No push subscription for this crew member' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const appUrl   = (Deno.env.get('CHKCHK_APP_URL') || 'https://chk-chk.vercel.app').replace(/\/$/, '')
    const deepLink = `${appUrl}/checklist/${checklist_id}`
    const payload  = JSON.stringify({
      title: '📋 New order assigned',
      body:  `You've been assigned "${checklist.title}". Tap to view your tasks.`,
      url:   deepLink,
    })

    webpush.setVapidDetails(contact, publicKey, privateKey)

    let sent = 0
    for (const row of rows) {
      const sub = row.subscription as { endpoint: string; keys: { p256dh: string; auth: string } }
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) continue

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          payload,
        )
        sent += 1
      } catch (e: unknown) {
        const statusCode = Number((e as { statusCode?: number })?.statusCode ?? 0)
        if (statusCode === 404 || statusCode === 410) {
          // Expired subscription — remove it
          await admin.from('chkchk_push_subscriptions').delete().eq('id', row.id)
        } else {
          console.error('Web push send error:', e)
        }
      }
    }

    return new Response(JSON.stringify({ sent: sent > 0, count: sent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-assignee-chkchk error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
